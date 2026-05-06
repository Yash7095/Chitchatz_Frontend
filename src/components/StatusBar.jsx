import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useStatusStore } from "../store/useStatusStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import StatusUploader from "./StatusUploader.jsx";
import StatusViewer from "./StatusViewer.jsx";

const StatusBar = () => {
  const { statusGroups, getStatuses, openViewer, viewerOpen } = useStatusStore();
  const { authUser } = useStatusStore();
  const { authUser: user } = useAuthStore();

  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    getStatuses();
  }, [getStatuses]);

  // Find own status group
  const ownGroup = statusGroups.find(
    (g) => g.user._id === user?._id
  );
  const others = statusGroups.filter((g) => g.user._id !== user?._id);

  return (
    <>
      <div className="flex items-center gap-3 px-3 py-2 overflow-x-auto scrollbar-hide border-b border-base-300">
        {/* My Status */}
        <button
          onClick={() => ownGroup ? openViewer(statusGroups.indexOf(ownGroup)) : setShowUploader(true)}
          className="flex flex-col items-center gap-1 shrink-0 group"
        >
          <div className="relative">
            <div
              className={`size-12 rounded-full p-0.5 ${
                ownGroup ? "bg-gradient-to-tr from-primary to-secondary" : "bg-base-300"
              }`}
            >
              <div className="size-full rounded-full border-2 border-base-100 overflow-hidden">
                <img
                  src={user?.profilePic || "/avatar.png"}
                  alt="my status"
                  className="size-full object-cover"
                />
              </div>
            </div>
            {!ownGroup && (
              <span className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-primary flex items-center justify-center ring-2 ring-base-100">
                <Plus className="size-2.5 text-primary-content" />
              </span>
            )}
          </div>
          <span className="text-xs text-base-content/60 truncate w-12 text-center">
            {ownGroup ? "My Status" : "Add"}
          </span>
        </button>

        {/* Others */}
        {others.map((group, idx) => {
          const realIdx = statusGroups.indexOf(group);
          return (
            <button
              key={group.user._id}
              onClick={() => openViewer(realIdx)}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div
                className={`size-12 rounded-full p-0.5 ${
                  group.hasUnseen
                    ? "bg-gradient-to-tr from-primary to-secondary"
                    : "bg-base-300"
                }`}
              >
                <div className="size-full rounded-full border-2 border-base-100 overflow-hidden">
                  <img
                    src={group.user.profilePic || "/avatar.png"}
                    alt={group.user.fullName}
                    className="size-full object-cover"
                  />
                </div>
              </div>
              <span className="text-xs text-base-content/60 truncate w-12 text-center">
                {group.user.fullName.split(" ")[0]}
              </span>
            </button>
          );
        })}

        {statusGroups.length === 0 && !ownGroup && (
          <p className="text-xs text-base-content/40 px-2">No statuses yet</p>
        )}
      </div>

      {showUploader && <StatusUploader onClose={() => setShowUploader(false)} />}
      {viewerOpen && <StatusViewer />}
    </>
  );
};

export default StatusBar;
