import express from "express";
import { client } from "../dbConfig.js";
import { ObjectId } from "mongodb";

const router = express.Router();
const db = client.db("express");
const Products = db.collection("products");

// ---------------- ADD PRODUCT ----------------
router.post("/user/product", async (req, res) => {
  try {
    const { title, description, price } = req.body;

    if (!title || !description || !price) {
      return res.status(400).json({ status: 0, message: "All fields are required" });
    }

    const product = {
      title,
      description,
      price,
      createdAt: new Date(),
    };

    const response = await Products.insertOne(product);

    if (response.acknowledged) {
      return res.status(201).json({ status: 1, message: "Product added successfully" });
    } else {
      return res.status(500).json({ status: 0, message: "Something went wrong" });
    }
  } catch (error) {
    console.error("Add Product Error:", error);
    res.status(500).json({ status: 0, message: "Internal Server Error" });
  }
});

// ---------------- GET ALL PRODUCTS ----------------
router.get("/user/product", async (req, res) => {
  try {
    const allProducts = await Products.find().toArray();

    if (allProducts.length > 0) {
      return res.status(200).json({ status: 1, data: allProducts });
    } else {
      return res.status(404).json({ status: 0, message: "No products found" });
    }
  } catch (error) {
    console.error("Get Products Error:", error);
    res.status(500).json({ status: 0, message: "Internal Server Error" });
  }
});

// ---------------- DELETE PRODUCT ----------------
router.delete("/user/product/:id", async (req, res) => {
  try {
    const productId = new ObjectId(req.params.id);
    const result = await Products.deleteOne({ _id: productId });

    if (result.deletedCount > 0) {
      return res.status(200).json({ status: 1, message: "Product deleted successfully" });
    } else {
      return res.status(404).json({ status: 0, message: "Product not found" });
    }
  } catch (error) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ status: 0, message: "Internal Server Error" });
  }
});

// ---------------- UPDATE PRODUCT ----------------
router.put("/user/product/:id", async (req, res) => {
  try {
    const productId = new ObjectId(req.params.id);
    const { title, description, price } = req.body;

    const result = await Products.updateOne(
      { _id: productId },
      { $set: { title, description, price } }
    );

    if (result.modifiedCount > 0) {
      return res.status(200).json({ status: 1, message: "Product updated successfully" });
    } else {
      return res.status(404).json({ status: 0, message: "Product not found or no changes" });
    }
  } catch (error) {
    console.error("Update Product Error:", error);
    res.status(500).json({ status: 0, message: "Internal Server Error" });
  }
});

// ---------------- GET PRODUCT BY ID ----------------
router.get("/user/product/:id", async (req, res) => {
  try {
    const productId = new ObjectId(req.params.id);
    const product = await Products.findOne({ _id: productId });

    if (product) {
      return res.status(200).json({ status: 1, data: product });
    } else {
      return res.status(404).json({ status: 0, message: "Product not found" });
    }
  } catch (error) {
    console.error("Get Product Error:", error);
    res.status(500).json({ status: 0, message: "Internal Server Error" });
  }
});

export default router;
