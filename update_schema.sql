-- Drop the profiles table logic, we will use the existing 'users' table
-- Since the app already relies on a 'users' table, we adapt the schema.

-- ENUMS
DO $$ BEGIN
    CREATE TYPE follow_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE post_media_type AS ENUM ('text', 'image', 'video', 'workspace');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ADD TO EXISTING USERS TABLE
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- FOLLOWS (Social Graph)
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status follow_status DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- POSTS (The Feed)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content_text TEXT,
  media_url TEXT,
  media_type post_media_type DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMMENTS
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LIKES
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-------------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- 1. Users RLS
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 2. Follows RLS
DROP POLICY IF EXISTS "Users can see their own follows" ON public.follows;
CREATE POLICY "Users can see their own follows" ON public.follows FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);

DROP POLICY IF EXISTS "Users can manage their outgoing follows" ON public.follows;
CREATE POLICY "Users can manage their outgoing follows" ON public.follows FOR ALL USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can manage their incoming follows (approvals)" ON public.follows;
CREATE POLICY "Users can manage their incoming follows (approvals)" ON public.follows FOR UPDATE USING (auth.uid() = following_id);

-- 3. Posts RLS
DROP POLICY IF EXISTS "View posts policy" ON public.posts;
CREATE POLICY "View posts policy" ON public.posts FOR SELECT USING (
    author_id = auth.uid()
    OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = posts.author_id AND users.is_public = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.follows 
      WHERE follows.follower_id = auth.uid() 
        AND follows.following_id = posts.author_id 
        AND follows.status = 'approved'
    )
);

DROP POLICY IF EXISTS "Users can insert own posts" ON public.posts;
CREATE POLICY "Users can insert own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = author_id);

-- 4. Comments RLS
DROP POLICY IF EXISTS "View comments policy" ON public.comments;
CREATE POLICY "View comments policy" ON public.comments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.posts WHERE posts.id = comments.post_id)
);

DROP POLICY IF EXISTS "Users can insert own comments" ON public.comments;
CREATE POLICY "Users can insert own comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id);

-- 5. Likes RLS
DROP POLICY IF EXISTS "View likes policy" ON public.likes;
CREATE POLICY "View likes policy" ON public.likes FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.posts WHERE posts.id = likes.post_id)
);

DROP POLICY IF EXISTS "Users can manage own likes" ON public.likes;
CREATE POLICY "Users can manage own likes" ON public.likes FOR ALL USING (auth.uid() = user_id);
