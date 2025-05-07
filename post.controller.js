import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";

export const getPosts = async (req, res) => {
  const query = req.query;

  try {
    const posts = await prisma.post.findMany({
      where: {
        city: query.city || undefined,
        type: query.type || undefined,
        property: query.property || undefined,
        bedroom: parseInt(query.bedroom) || undefined,
        price: {
          gte: parseInt(query.minPrice) || undefined,
          lte: parseInt(query.maxPrice) || undefined,
        },
      },
    });

    // setTimeout(() => {
    res.status(200).json(posts);
    // }, 3000);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to get posts" });
  }
};

export const getPost = async (req, res) => {
  const id = req.params.id;
  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        postDetail: true,
        user: {
          select: {
            username: true,
            avatar: true,
          },
        },
      },
    });

    const token = req.cookies?.token;

    if (token) {
      jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, payload) => {
        if (!err) {
          const saved = await prisma.savedPost.findUnique({
            where: {
              userId_postId: {
                postId: id,
                userId: payload.id,
              },
            },
          });

          console.log({ ...post, isSaved: saved ? true : false }, "this is data");

          // ✅ Prevents double response
          return res.status(200).json({ ...post, isSaved: saved ? true : false });
        } else {
          // Optional: handle invalid token
          return res.status(401).json({ message: "Invalid token" });
        }
      });

      return; // ✅ Prevents the second res.status below
    }

    // If no token, return with isSaved: false
    return res.status(200).json({ ...post, isSaved: false });

  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Failed to get post" });
  }
};


export const addPost = async (req, res) => {
  const body = req.body;
  const tokenUserId = req.userId;

  try {
    const newPost = await prisma.post.create({
      data: {
        ...body.postData,
        userId: tokenUserId,
        postDetail: {
          create: body.postDetail,
        },
      },
    });
    res.status(200).json(newPost);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to create post" });
  }
};

export const updatePost = async (req, res) => {
  const postId = req.params.id;
  const { postData, postDetail } = req.body;

  try {
    const {
      title,
      price,
      images,
      address,
      city,
      bedroom,
      bathroom,
      latitude,
      longitude,
      type,
      property,
    } = postData;

    // Build the post data dynamically
    const data = {};
    if (title !== undefined) data.title = title;
    if (price !== undefined) data.price = Number(price);
    if (images !== undefined) data.images = images;
    if (address !== undefined) data.address = address;
    if (city !== undefined) data.city = city;
    if (bedroom !== undefined) data.bedroom = bedroom;
    if (bathroom !== undefined) data.bathroom = bathroom;
    if (latitude !== undefined) data.latitude = latitude;
    if (longitude !== undefined) data.longitude = longitude;
    if (type !== undefined) data.type = type;
    if (property !== undefined) data.property = property;

    // Handle postDetail if provided
    if (postDetail !== undefined) {
      data.postDetail = {
        update: {
          ...postDetail,
          income: String(postDetail.income),
          size: Number(postDetail.size),
          school: Number(postDetail.school),
          bus: Number(postDetail.bus),
          restaurant: Number(postDetail.restaurant),
        },
      };
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data,
      include: {
        postDetail: true,
      },
    });

    res.status(200).json(updatedPost);
  } catch (err) {
    console.error("Failed to update post:", err);
    res.status(500).json({ message: "Failed to update post" });
  }
};




export const deletePost = async (req, res) => {
  const id = req.params.id;
  const tokenUserId = req.userId;

  try {
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (post.userId !== tokenUserId) {
      return res.status(403).json({ message: "Not Authorized!" });
    }

    await prisma.post.delete({
      where: { id },
    });

    res.status(200).json({ message: "Post deleted" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to delete post" });
  }
};
