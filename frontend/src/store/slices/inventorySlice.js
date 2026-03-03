import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { inventoryAPI } from '../../services/api';

export const fetchInventory = createAsyncThunk(
  'inventory/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await inventoryAPI.getInventory(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch inventory');
    }
  }
);

export const fetchInventoryItem = createAsyncThunk(
  'inventory/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await inventoryAPI.getItem(id);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch item');
    }
  }
);

export const createInventoryItem = createAsyncThunk(
  'inventory/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await inventoryAPI.createItem(data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create item');
    }
  }
);

export const updateQuantity = createAsyncThunk(
  'inventory/updateQuantity',
  async ({ id, quantity, operation }, { rejectWithValue }) => {
    try {
      const response = await inventoryAPI.updateQuantity(id, { quantity, operation });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update quantity');
    }
  }
);

export const recordPurchase = createAsyncThunk(
  'inventory/recordPurchase',
  async (data, { rejectWithValue }) => {
    try {
      const response = await inventoryAPI.recordPurchase(data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to record purchase');
    }
  }
);

const initialState = {
  items: [],
  currentItem: null,
  loading: false,
  error: null,
  filters: {
    lowStock: false,
  },
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearCurrentItem: (state) => {
      state.currentItem = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Inventory
      .addCase(fetchInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Inventory Item
      .addCase(fetchInventoryItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryItem.fulfilled, (state, action) => {
        state.loading = false;
        state.currentItem = action.payload;
      })
      .addCase(fetchInventoryItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Inventory Item
      .addCase(createInventoryItem.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      // Update Quantity
      .addCase(updateQuantity.fulfilled, (state, action) => {
        const index = state.items.findIndex(i => i.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentItem?.id === action.payload.id) {
          state.currentItem = action.payload;
        }
      })
      // Record Purchase
      .addCase(recordPurchase.fulfilled, (state, action) => {
        // Update the inventory item quantity
        const index = state.items.findIndex(i => i.id === action.payload.inventory_id);
        if (index !== -1) {
          state.items[index].quantity += action.payload.quantity;
        }
      });
  },
});

export const { setFilters, clearCurrentItem, clearError } = inventorySlice.actions;
export default inventorySlice.reducer;
