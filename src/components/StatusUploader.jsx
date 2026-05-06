import { useRef, useState } from "react";
import { X, ImagePlus, Video, Loader } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStatusStore } from "../store/useStatusStore.js";
import toast from "react-hot-toast";

const StatusUploader = ({ onClose }) => {
  const [media, setMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef(null);
  const { createStatus, isUploading } = useStatusStore();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) return toast.error("Only images and videos allowed");
    if (isVideo && file.size > 50 * 1024 * 1024) return toast.error("Video must be under 50MB");

    const reader = new FileReader();
    reader.onload = () => {
      setMedia(reader.result);
      setMediaType(isVideo ? "video" : "image");
    };
    reader.readAsDataURL(file);
  };

  const handlePost = async () => {
    if (!media) return toast.error("Pick a photo or video first");
    await createStatus({ media, mediaType, caption });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-base-100 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Add to Status</h3>
            <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
              <X className="size-4" />
            </button>
          </div>

          {/* Media picker */}
          {!media ? (
            <div className="space-y-3">
              <button
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-base-300 hover:border-primary hover:bg-primary/5 transition-all"
                onClick={() => {
                  fileInputRef.current.accept = "image/*";
                  fileInputRef.current.click();
                }}
              >
                <ImagePlus className="size-6 text-primary" />
                <span className="font-medium">Photo</span>
              </button>
              <button
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-base-300 hover:border-secondary hover:bg-secondary/5 transition-all"
                onClick={() => {
                  fileInputRef.current.accept = "video/*";
                  fileInputRef.current.click();
                }}
              >
                <Video className="size-6 text-secondary" />
                <span className="font-medium">Video</span>
              </button>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFile} />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Preview */}
              <div className="relative rounded-xl overflow-hidden bg-black">
                {mediaType === "image" ? (
                  <img src={media} alt="preview" className="w-full max-h-64 object-contain" />
                ) : (
                  <video src={media} controls className="w-full max-h-64" />
                )}
                <button
                  onClick={() => { setMedia(null); setMediaType(null); }}
                  className="absolute top-2 right-2 btn btn-circle btn-xs bg-black/60 border-none text-white"
                >
                  <X className="size-3" />
                </button>
              </div>

              {/* Caption */}
              <input
                type="text"
                className="input input-bordered w-full input-sm"
                placeholder="Add a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={200}
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button className="btn btn-ghost flex-1 btn-sm" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary flex-1 btn-sm gap-2"
              onClick={handlePost}
              disabled={!media || isUploading}
            >
              {isUploading ? <Loader className="size-4 animate-spin" /> : null}
              {isUploading ? "Posting..." : "Post Status"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StatusUploader;
