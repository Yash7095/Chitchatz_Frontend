import { useState } from "react";
import { X, Camera, Loader, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGroupStore } from "../store/useGroupStore.js";
import { useChatStore } from "../store/useChatStore.js";
import toast from "react-hot-toast";

const CreateGroupModal = ({ onClose }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groupPic, setGroupPic] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { createGroup } = useGroupStore();
  const { users } = useChatStore();

  const filtered = users.filter((u) =>
    u.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const toggleMember = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setGroupPic(reader.result);
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!name.trim()) return toast.error("Group name is required");
    if (selectedIds.length < 1) return toast.error("Add at least 1 member");
    setIsCreating(true);
    await createGroup({ name, description, memberIds: selectedIds, groupPic });
    setIsCreating(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-base-100 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
            <h2 className="font-bold text-lg">New Group</h2>
            <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
              <X className="size-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Group pic + name */}
            <div className="flex items-center gap-4">
              <label className="relative cursor-pointer shrink-0">
                <div className="size-16 rounded-full bg-base-300 flex items-center justify-center overflow-hidden border-2 border-base-300">
                  {groupPic ? (
                    <img src={groupPic} alt="group" className="size-full object-cover" />
                  ) : (
                    <Camera className="size-6 text-base-content/40" />
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  className="input input-bordered w-full input-sm"
                  placeholder="Group name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                />
                <input
                  type="text"
                  className="input input-bordered w-full input-sm"
                  placeholder="Description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>

            {/* Member search */}
            <div>
              <p className="text-xs text-base-content/50 mb-2 font-medium">
                ADD MEMBERS ({selectedIds.length} selected)
              </p>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-base-content/40" />
                <input
                  type="text"
                  className="input input-bordered w-full input-xs pl-8"
                  placeholder="Search contacts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto">
                {filtered.map((user) => {
                  const selected = selectedIds.includes(user._id);
                  return (
                    <button
                      key={user._id}
                      onClick={() => toggleMember(user._id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                        selected ? "bg-primary/10 border border-primary/30" : "hover:bg-base-200"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={user.profilePic || "/avatar.png"}
                          alt={user.fullName}
                          className="size-8 rounded-full object-cover"
                        />
                        {selected && (
                          <span className="absolute -bottom-0.5 -right-0.5 size-4 bg-primary rounded-full flex items-center justify-center text-primary-content text-xs font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-left">{user.fullName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-base-300 flex gap-2">
            <button className="btn btn-ghost flex-1 btn-sm" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary flex-1 btn-sm gap-2"
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? <Loader className="size-4 animate-spin" /> : null}
              Create Group
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateGroupModal;
