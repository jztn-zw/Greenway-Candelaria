import api from "../lib/api";

export interface PostFilters {
  category?: string;
  status?: string;
  is_featured?: boolean;
  tag?: string;
  all?: boolean;
}

const postsService = {
  // ─── Upload image to Cloudinary via backend
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file); // must match upload.single("file") in backend

    const { data } = await api.post("/posts/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return data.data.url; // Cloudinary URL string
  },

  // ─── Get all posts
  getAll: async (filters: PostFilters = {}) => {
    const { data } = await api.get("/posts", { params: filters });
    return data.data;
  },

  // ─── Get single post
  getById: async (id: string) => {
    const { data } = await api.get(`/posts/${id}`);
    return data.data;
  },

  // ─── Create post (admin only)
  create: async (payload: {
    title: string;
    body: string;
    source?: string;
    category: string;
    status: string;
    is_featured: boolean;
    scheduled_at?: string;
    images?: string[];
    tags?: string[];
  }) => {
    const { data } = await api.post("/posts", payload);
    return data.data;
  },

  // ─── Update post (admin only)
  update: async (
    id: string,
    payload: Partial<{
      title: string;
      body: string;
      source: string;
      category: string;
      status: string;
      is_featured: boolean;
      scheduled_at: string | null;
      images: string[];
      tags: string[];
    }>,
  ) => {
    const { data } = await api.put(`/posts/${id}`, payload);
    return data.data;
  },

  // ─── Delete post (admin only)
  delete: async (id: string) => {
    const { data } = await api.delete(`/posts/${id}`);
    return data;
  },

  // ─── Like / Unlike
  like: async (id: string) => {
    const { data } = await api.post(`/posts/${id}/like`);
    return data.data;
  },

  unlike: async (id: string) => {
    const { data } = await api.delete(`/posts/${id}/like`);
    return data.data;
  },

  // ─── Bookmarks
  getBookmarks: async () => {
    const { data } = await api.get("/posts/bookmarks");
    return data.data;
  },

  bookmark: async (id: string) => {
    const { data } = await api.post(`/posts/${id}/bookmark`);
    return data.data;
  },

  unbookmark: async (id: string) => {
    const { data } = await api.delete(`/posts/${id}/bookmark`);
    return data.data;
  },
};

export default postsService;
