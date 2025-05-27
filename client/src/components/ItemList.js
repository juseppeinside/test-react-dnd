import React from "react";
import axios from "axios";
import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const API_URL =
  process.env.NODE_ENV === "production" ? "/api" : "http://localhost:5000/api";

const ItemTypes = {
  ROW: "row",
};

const DraggableRow = ({
  item,
  index,
  selectedIds,
  onSelect,
  moveRow,
  onDragEnd,
}) => {
  const ref = React.useRef(null);

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.ROW,
    item: () => ({ id: item.id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: () => {
      onDragEnd();
    },
  });

  const [, drop] = useDrop({
    accept: ItemTypes.ROW,
    hover(dragItem, monitor) {
      if (!ref.current) {
        return;
      }

      const dragIndex = dragItem.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current.getBoundingClientRect();

      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      const clientOffset = monitor.getClientOffset();

      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      moveRow(dragItem.id, dragIndex, hoverIndex);

      dragItem.index = hoverIndex;
    },
  });

  drag(drop(ref));

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onSelect(item.id);
  };

  return (
    <tr
      ref={ref}
      className={`draggable-row ${isDragging ? "is-dragging" : ""}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <td className="checkbox-container" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selectedIds.includes(item.id)}
          onChange={handleCheckboxClick}
          onClick={(e) => e.stopPropagation()}
        />
      </td>
      <td>{item.id}</td>
      <td>{item.value}</td>
    </tr>
  );
};

const ItemList = () => {
  const [items, setItems] = React.useState([]);
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [totalItems, setTotalItems] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);
  const [, setOrder] = React.useState([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [sortConfig, setSortConfig] = React.useState({
    key: null,
    direction: "asc",
  });

  const tableContainerRef = React.useRef(null);
  const limit = 20;

  const fetchItems = React.useCallback(async () => {
    try {
      setLoading(true);

      const response = await axios.get(`${API_URL}/items`, {
        params: { page, limit, search },
      });

      const {
        items: newItems,
        totalItems,
        totalPages,
        selectedIds: savedSelectedIds,
      } = response.data;

      if (page === 1) {
        setItems(newItems);
      } else {
        setItems((prevItems) => [...prevItems, ...newItems]);
      }

      setTotalItems(totalItems);
      setTotalPages(totalPages);

      if (page === 1 && savedSelectedIds && savedSelectedIds.length > 0) {
        setSelectedIds(savedSelectedIds);
      }

      setLoading(false);
    } catch (error) {
      console.error("Ошибка при загрузке данных:", error);
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [page, limit, search]);

  React.useEffect(() => {
    const checkScrollForLoading = () => {
      const container = tableContainerRef.current;
      if (!container || loading || isDragging || isLoadingMore) return;

      const { scrollTop, clientHeight, scrollHeight } = container;
      const scrollPosition = scrollTop + clientHeight;
      const scrollThreshold = scrollHeight * 0.8;

      if (
        scrollPosition > scrollThreshold &&
        page < totalPages &&
        items.length < totalItems
      ) {
        setIsLoadingMore(true);
        setPage((prevPage) => prevPage + 1);
      }
    };

    const containerElement = tableContainerRef.current;
    if (containerElement) {
      const currentContainerElement = containerElement;
      currentContainerElement.addEventListener("scroll", checkScrollForLoading);

      return () => {
        currentContainerElement.removeEventListener(
          "scroll",
          checkScrollForLoading
        );
      };
    }
    return undefined;
  }, [
    loading,
    isDragging,
    isLoadingMore,
    page,
    totalPages,
    items.length,
    totalItems,
  ]);

  React.useEffect(() => {
    if (isDragging && tableContainerRef.current) {
      const originalOverflow = tableContainerRef.current.style.overflowY;
      const currentTableContainer = tableContainerRef.current;
      currentTableContainer.style.overflowY = "hidden";
      return () => {
        if (currentTableContainer) {
          currentTableContainer.style.overflowY = originalOverflow;
        }
      };
    }
  }, [isDragging]);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  React.useEffect(() => {
    if (!isDragging) {
      fetchItems();
    }
  }, [search, page, isDragging, fetchItems]);

  React.useEffect(() => {
    setIsLoadingMore(false);
  }, [items]);

  const sortedItems = React.useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortDirectionIcon = (key) => {
    if (sortConfig.key !== key) {
      return "";
    }
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleItemSelect = (id) => {
    const isSelected = selectedIds.includes(id);

    let newSelectedIds;
    if (isSelected) {
      newSelectedIds = selectedIds.filter((selectedId) => selectedId !== id);
    } else {
      newSelectedIds = [...selectedIds, id];
    }

    setSelectedIds(newSelectedIds);

    saveSelectedIds(newSelectedIds);
  };

  const saveSelectedIds = async (ids) => {
    try {
      await axios.post(`${API_URL}/selected`, { selectedIds: ids });
    } catch (error) {
      console.error("Ошибка при сохранении выбранных элементов:", error);
    }
  };

  const saveOrder = async (newOrder) => {
    try {
      await axios.post(`${API_URL}/order`, { order: newOrder });
    } catch (error) {
      console.error("Ошибка при сохранении порядка элементов:", error);
    }
  };

  const moveRow = React.useCallback(
    (dragId, dragIndex, hoverIndex) => {
      if (!isDragging) {
        setIsDragging(true);
      }

      try {
        const currentItems = sortConfig.key ? sortedItems : items;

        const dragItemId = dragId;
        const hoverItemId = currentItems[hoverIndex].id;

        const originalDragIndex = currentItems.findIndex(
          (item) => item.id === dragItemId
        );
        const originalHoverIndex = currentItems.findIndex(
          (item) => item.id === hoverItemId
        );

        if (originalDragIndex === -1 || originalHoverIndex === -1) {
          console.error("Не удалось найти элементы для перемещения");
          return;
        }

        const newItems = [...currentItems];
        const [draggedItem] = newItems.splice(originalDragIndex, 1);
        newItems.splice(originalHoverIndex, 0, draggedItem);

        if (sortConfig.key) {
          setSortConfig({ key: null, direction: "asc" });
        }

        setItems(newItems);
      } catch (error) {
        console.error("Ошибка при перемещении строки:", error);
      }
    },
    [items, sortedItems, isDragging, sortConfig]
  );

  const handleDragEnd = React.useCallback(() => {
    if (!isDragging) return;

    const newOrder = items.map((item) => item.id);
    setOrder(newOrder);
    saveOrder(newOrder);

    setIsDragging(false);
  }, [items, isDragging]);

  if (items.length === 0 && !loading) {
    return <div className="loading-indicator">Загрузка данных...</div>;
  }

  return (
    <div className="item-list-container">
      <div className="search-container">
        <input
          type="text"
          placeholder="Поиск..."
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      <div className="table-container" ref={tableContainerRef}>
        <DndProvider backend={HTML5Backend}>
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: "50px" }}>Выбор</th>
                <th
                  style={{ width: "80px", cursor: "pointer" }}
                  onClick={() => requestSort("id")}
                  className={sortConfig.key === "id" ? "sorted" : ""}
                >
                  ID {getSortDirectionIcon("id")}
                </th>
                <th
                  onClick={() => requestSort("value")}
                  className={sortConfig.key === "value" ? "sorted" : ""}
                  style={{ cursor: "pointer" }}
                >
                  Значение {getSortDirectionIcon("value")}
                </th>
              </tr>
            </thead>
            <tbody>
              {(sortConfig.key ? sortedItems : items).map((item, index) => (
                <DraggableRow
                  key={item.id}
                  item={item}
                  index={index}
                  selectedIds={selectedIds}
                  onSelect={handleItemSelect}
                  moveRow={moveRow}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </tbody>
          </table>
        </DndProvider>
      </div>

      {loading && <div className="loading-indicator">Загрузка...</div>}
    </div>
  );
};

export default ItemList;
