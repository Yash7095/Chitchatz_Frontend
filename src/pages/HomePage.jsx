import React from "react";
import { useChatStore } from "../store/useChatStore.js";
import { useGroupStore } from "../store/useGroupStore.js";
import SideBar from "../components/SideBar.jsx";
import ChatContainer from "../components/ChatContainer.jsx";
import GroupChatContainer from "../components/GroupChatContainer.jsx";
import NoChatSelected from "../components/NoChatSelected.jsx";

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const { selectedGroup } = useGroupStore();

  return (
    <div className="h-screen bg-base-200">
      <div className="flex items-center justify-center pt-20 px-4">
        <div className="bg-base-100 rounded-lg shadow-cl w-full max-w-6xl h-[calc(100vh-8rem)]">
          <div className="flex h-full rounded-lg overflow-hidden">
            <SideBar />

            {selectedGroup
              ? <GroupChatContainer />
              : selectedUser
              ? <ChatContainer />
              : <NoChatSelected />
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
