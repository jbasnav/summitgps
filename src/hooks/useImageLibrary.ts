/**
 * useImageLibrary — manage user-uploaded cover images.
 *
 * Images are stored as:
 *   - base64 dataURL in localStorage (always available, guest + logged-in)
 *   - Supabase Storage "cover-images" bucket when a logged-in user uploads
 *     (the public URL replaces the base64 so it's lighter in localStorage)
 *
 * localStorage key: "summit_image_library"
 * Max recommended: 20 images · warn above 15
 */

import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../utils/supabaseClient";

export interface LibraryImage {
  id: string;
  name: string;
  url: string;       // public URL (Supabase) or base64 dataURL (guest)
  createdAt: string; // ISO date string
}

const MAX_IMAGES = 20;

export function useImageLibrary(userId?: string | null) {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lastLoadedUserId, setLastLoadedUserId] = useState<string | null | undefined>(undefined);

  // Load from storage reactively when userId changes
  useEffect(() => {
    const key = userId ? `summit_image_library_${userId}` : "summit_image_library";
    try {
      const raw = localStorage.getItem(key);
      setImages(raw ? JSON.parse(raw) : []);
    } catch {
      setImages([]);
    }
    setLastLoadedUserId(userId);
  }, [userId]);

  // Keep localStorage in sync whenever images change (only when loaded state is aligned with current user)
  useEffect(() => {
    if (lastLoadedUserId !== userId) return;
    const key = userId ? `summit_image_library_${userId}` : "summit_image_library";
    try {
      localStorage.setItem(key, JSON.stringify(images));
    } catch (e) {
      console.warn("useImageLibrary: failed to save to localStorage", e);
    }
  }, [images, userId, lastLoadedUserId]);

  /**
   * Add a new image from a File object.
   * Returns the new LibraryImage on success, null on failure.
   */
  const addImage = useCallback(async (file: File, name: string): Promise<LibraryImage | null> => {
    if (images.length >= MAX_IMAGES) return null;

    setUploading(true);
    try {
      const id = `lib-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      let url = "";

      // Try Supabase Storage first (logged-in users)
      if (userId && isSupabaseConfigured) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${userId}/covers/${id}.${ext}`;
        const { error } = await supabase.storage
          .from("waypoint-photos")
          .upload(path, file, { cacheControl: "3600", upsert: false });

        if (!error) {
          const { data: urlData } = supabase.storage
            .from("waypoint-photos")
            .getPublicUrl(path);
          url = urlData.publicUrl;
        }
      }

      // Fallback / guest: convert to base64 dataURL
      if (!url) {
        url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const newImage: LibraryImage = {
        id,
        name: name.trim() || file.name.replace(/\.[^.]+$/, ""),
        url,
        createdAt: new Date().toISOString(),
      };

      setImages((prev) => [newImage, ...prev]);
      return newImage;
    } catch (err) {
      console.error("useImageLibrary: upload failed", err);
      return null;
    } finally {
      setUploading(false);
    }
  }, [images.length, userId]);

  /**
   * Delete an image by id.
   * Also removes it from Supabase Storage if it's a cloud URL.
   */
  const deleteImage = useCallback(async (id: string) => {
    const img = images.find((i) => i.id === id);
    if (!img) return;

    // Try to remove from Supabase Storage if applicable
    if (userId && isSupabaseConfigured && img.url.includes("supabase")) {
      try {
        // Extract path from public URL: everything after /object/public/waypoint-photos/
        const match = img.url.match(/waypoint-photos\/(.+)$/);
        if (match) {
          await supabase.storage.from("waypoint-photos").remove([match[1]]);
        }
      } catch {
        // Non-fatal: local state is still removed
      }
    }

    setImages((prev) => prev.filter((i) => i.id !== id));
  }, [images, userId]);

  /** Rename an existing image */
  const renameImage = useCallback((id: string, newName: string) => {
    setImages((prev) =>
      prev.map((i) => (i.id === id ? { ...i, name: newName.trim() || i.name } : i))
    );
  }, []);

  return { images, uploading, addImage, deleteImage, renameImage, maxImages: MAX_IMAGES };
}
