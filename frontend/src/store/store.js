import { configureStore } from '@reduxjs/toolkit';
import menuReducer from './slices/menuSlice';
import orderReducer from './slices/orderSlice';
import tableReducer from './slices/tableSlice';
import inventoryReducer from './slices/inventorySlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    menu: menuReducer,
    orders: orderReducer,
    tables: tableReducer,
    inventory: inventoryReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
