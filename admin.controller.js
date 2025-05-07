import prisma from "../lib/prisma.js";

// Apply the middleware to routes where admin validation is needed
export const deleteUser = async (req, res) => {
    const userIdToDelete = req.params.userId;
  
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
      });
  
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "You are not authorized to delete users!" });
      }
  
      // 1. Find all posts of the user
      const userPosts = await prisma.post.findMany({
        where: { userId: userIdToDelete },
      });
  
      const postIds = userPosts.map((post) => post.id);
  
      // 2. Delete all post details related to the user's posts
      await prisma.postDetail.deleteMany({
        where: {
          postId: { in: postIds },
        },
      });
  
      // 3. Delete all saved posts by the user
      await prisma.savedPost.deleteMany({
        where: {
          OR: [
            { userId: userIdToDelete },
            { postId: { in: postIds } },
          ],
        },
      });
  
      // 4. Delete all posts by the user
      await prisma.post.deleteMany({
        where: { userId: userIdToDelete },
      });
  
      // 5. Finally, delete the user
      const deletedUser = await prisma.user.delete({
        where: { id: userIdToDelete },
      });
  
      res.status(200).json({ message: "User deleted successfully", deletedUser });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to delete user!" });
    }
  };
  
  

// Add the route in your routes file (Express example)
