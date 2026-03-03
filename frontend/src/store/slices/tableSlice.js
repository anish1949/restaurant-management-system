import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { tableAPI } from '../../services/api';

export const fetchTables = createAsyncThunk(
  'tables/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await tableAPI.getTables(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch tables');
    }
  }
);

export const fetchTableById = createAsyncThunk(
  'tables/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await tableAPI.getTable(id);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch table');
    }
  }
);

export const updateTableStatus = createAsyncThunk(
  'tables/updateStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await tableAPI.updateTableStatus(id, status);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update table');
    }
  }
);

export const createTable = createAsyncThunk(
  'tables/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await tableAPI.createTable(data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create table');
    }
  }
);

const initialState = {
  tables: [],
  currentTable: null,
  loading: false,
  error: null,
  filters: {
    status: 'all',
  },
};

const tableSlice = createSlice({
  name: 'tables',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearCurrentTable: (state) => {
      state.currentTable = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Tables
      .addCase(fetchTables.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTables.fulfilled, (state, action) => {
        state.loading = false;
        state.tables = action.payload;
      })
      .addCase(fetchTables.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Table By ID
      .addCase(fetchTableById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTableById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTable = action.payload;
      })
      .addCase(fetchTableById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Table Status
      .addCase(updateTableStatus.fulfilled, (state, action) => {
        const index = state.tables.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tables[index] = action.payload;
        }
        if (state.currentTable?.id === action.payload.id) {
          state.currentTable = action.payload;
        }
      })
      // Create Table
      .addCase(createTable.fulfilled, (state, action) => {
        state.tables.push(action.payload);
      });
  },
});

export const { setFilters, clearCurrentTable, clearError } = tableSlice.actions;
export default tableSlice.reducer;
