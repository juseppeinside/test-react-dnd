const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

const DATA = {
  items: Array.from({ length: 1000000 }, (_, i) => ({
    id: i + 1,
    value: `Элемент ${i + 1}`,
  })),
  selectedIds: [],
  order: [],
};

app.get("/api/items", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || "";

  let filteredItems = DATA.items;

  if (search) {
    filteredItems = filteredItems.filter(
      (item) =>
        item.value.toLowerCase().includes(search.toLowerCase()) ||
        item.id.toString().includes(search)
    );
  }

  if (DATA.order.length > 0) {
    const sortedItems = [...filteredItems];

    sortedItems.sort((a, b) => {
      const indexA = DATA.order.indexOf(a.id);
      const indexB = DATA.order.indexOf(b.id);

      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });

    filteredItems = sortedItems;
  }

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const results = {
    totalItems: filteredItems.length,
    totalPages: Math.ceil(filteredItems.length / limit),
    currentPage: page,
    items: filteredItems.slice(startIndex, endIndex),
    selectedIds: DATA.selectedIds,
  };

  res.json(results);
});

app.post("/api/selected", (req, res) => {
  const { selectedIds } = req.body;

  if (Array.isArray(selectedIds)) {
    DATA.selectedIds = selectedIds;
    res.json({ success: true, selectedIds: DATA.selectedIds });
  } else {
    res.status(400).json({ success: false, message: "Invalid data format" });
  }
});

app.post("/api/order", (req, res) => {
  const { order } = req.body;

  if (Array.isArray(order)) {
    DATA.order = order;
    res.json({ success: true, order: DATA.order });
  } else {
    res.status(400).json({ success: false, message: "Invalid data format" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
