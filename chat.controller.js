import prisma from "../lib/prisma.js";

export const getChats = async (req, res) => {
  const tokenUserId = req.userId;

  try {
    const chats = await prisma.chat.findMany({
      where: {
        userIDs: {
          hasSome: [tokenUserId],
        },
      },
    });

    for (const chat of chats) {
      const receiverId = chat.userIDs.find((id) => id !== tokenUserId);
      console.log(receiverId, "receiverid");
    
      // ✅ Skip if receiverId is not found (i.e., user chatted with themselves)
      if (!receiverId) {
        chat.receiver = {
          id: tokenUserId,
          username: "You",
          avatar: "", // optionally use your own avatar here
        };
        continue;
      }
      const receiver = await prisma.user.findUnique({
        where: {
          id: receiverId,
        },
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      });
      chat.receiver = receiver;
    }

    res.status(200).json(chats);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to get chats!" });
  }
};

export const getChat = async (req, res) => {
  const tokenUserId = req.userId;

  try {
    const chat = await prisma.chat.findUnique({
      where: {
        id: req.params.id,
        userIDs: {
          hasSome: [tokenUserId],
        },
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    await prisma.chat.update({
      where: {
        id: req.params.id,
      },
      data: {
        seenBy: {
          push: [tokenUserId],
        },
      },
    });
    res.status(200).json(chat);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to get chat!" });
  }
};

export const addChat = async (req, res) => {
  const tokenUserId = req.userId;
  try {
    const newChat = await prisma.chat.create({
      data: {
        userIDs: [tokenUserId, req.body.receiverId],
      },
    });
    res.status(200).json(newChat);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to add chat!" });
  }
};

export const readChat = async (req, res) => {
  const tokenUserId = req.userId;
  const chatId = req.params.id;

  try {
    // ✅ Step 1: Find chat first
    const chat = await prisma.chat.findUnique({
      where: {
        id: chatId,
      },
    });

    // ✅ Step 2: Check if user is part of chat
    if (!chat || !chat.userIDs.includes(tokenUserId)) {
      return res.status(403).json({ message: "Chat not found or access denied!" });
    }

    // ✅ Step 3: Update seenBy only if not already present
    const updatedSeenBy = chat.seenBy.includes(tokenUserId)
      ? chat.seenBy // already seen
      : [...chat.seenBy, tokenUserId]; // push new user

    // ✅ Step 4: Update the chat
    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        seenBy: {
          set: updatedSeenBy,
        },
      },
    });

    res.status(200).json(updatedChat);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to read chat!" });
  }
};

