import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { uploadImage } from '@/utils/upload';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder: 'products' | 'services' | 'branding';
  max?: number;
}

export function ImageUploader({ images, onChange, folder, max = 6 }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = max - images.length;
    if (remaining <= 0) {
      toast.error(`You can upload up to ${max} images.`);
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const urls = await Promise.all(toUpload.map((f) => uploadImage(f, folder)));
      onChange([...images, ...urls]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((url, idx) => (
          <div key={url} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-gray-200">
            <img src={url} alt={`Upload ${idx + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((u) => u !== url))}
              className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white group-hover:flex"
              aria-label="Remove image"
            >
              ✕
            </button>
          </div>
        ))}

        {images.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-brand-500 hover:text-brand-600 disabled:opacity-50"
          >
            {uploading ? (
              <span className="text-xs">Uploading…</span>
            ) : (
              <>
                <span className="text-2xl leading-none">+</span>
                <span className="text-xs">Add photo</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="mt-2 text-xs text-gray-500">JPG, PNG, WEBP or GIF — up to 5MB each, max {max} images.</p>
    </div>
  );
}
