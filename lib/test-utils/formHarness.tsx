/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';
import { FormErrorProvider } from '@/lib/hooks/formErrorContext';

import idReducer from '@/lib/store/idSlice/idSlice';
import collapseReducer from '@/lib/store/collapseSlice/collapseSlice';
import authReducer from '@/lib/store/authSlice/authSlice';
import menuReducer from '@/lib/store/menuSlice/menuSlice';
import searchReducer from '@/lib/store/searchLookupSlice/searchLookupSlice';
import lookupReducer from '@/lib/store/lookupSlice/lookupSlice';
import roleaclReducer from '@/lib/store/roleaclSlice/roleaclSlice';
import userReducer from '@/lib/store/userSlice/userSlice';
import logtrailReducer from '@/lib/store/logtrailSlice/logtrailSlice';
import fieldLengthReducer from '@/lib/store/field-length/fieldLengthSlice';
import reportReducer from '@/lib/store/reportSlice/reportSlice';
import headerReducer from '@/lib/store/headerSlice/headerSlice';
import filterReducer from '@/lib/store/filterSlice/filterSlice';
import loadingReducer from '@/lib/store/loadingSlice/loadingSlice';
import tabReducer from '@/lib/store/tabSlice/tabSlice';
import selectLookupReducer from '@/lib/store/selectLookupSlice/selectLookupSlice';
import forceEditReducer from '@/lib/store/forceEditSlice/forceEditSlice';

// Silence react-query network errors triggered by hooks during render.
setLogger({
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  log: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  warn: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  error: () => {}
});

const rootReducer = combineReducers({
  id: idReducer,
  collapse: collapseReducer,
  logtrail: logtrailReducer,
  lookup: lookupReducer,
  fieldLength: fieldLengthReducer,
  auth: authReducer,
  roleacl: roleaclReducer,
  filter: filterReducer,
  menu: menuReducer,
  search: searchReducer,
  user: userReducer,
  report: reportReducer,
  loading: loadingReducer,
  header: headerReducer,
  selectLookup: selectLookupReducer,
  tab: tabReducer,
  forceedit: forceEditReducer
});

export function makeTestStore(preloadedState?: any) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false })
  });
}

// FormFooterButtons underlines the shortcut letter (<span>S</span>AVE), so the
// computed accessible name becomes "S AVE" / "C ancel". Match on the
// whitespace-stripped name.
const stripSpaces = (s: string) => s.replace(/\s+/g, '');
const byBtn = (label: string) => (name: string) =>
  stripSpaces(name) === stripSpaces(label);

export const getBtn = (label: string) =>
  screen.getByRole('button', { name: byBtn(label) });
export const queryBtn = (label: string) =>
  screen.queryByRole('button', { name: byBtn(label) });
export const saveButton = () => getBtn('SAVE');

export interface RenderFormOptions {
  schema?: any;
  mode?: 'add' | 'edit' | 'view' | 'delete' | string;
  defaultValues?: Record<string, any>;
  onValid?: jest.Mock;
  props?: Record<string, any>;
}

export interface RenderFormResult {
  onValid: jest.Mock;
  handleClose: jest.Mock;
  setPopOver: jest.Mock;
  store: ReturnType<typeof makeTestStore>;
}

export function renderForm(
  FormComponent: any,
  options: RenderFormOptions = {}
): RenderFormResult {
  const onValid = options.onValid ?? jest.fn();
  const handleClose = jest.fn();
  const setPopOver = jest.fn();
  const store = makeTestStore();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const Wrapper = () => {
    const forms = useForm({
      resolver: options.schema ? zodResolver(options.schema) : undefined,
      defaultValues: options.defaultValues ?? {},
      mode: 'onChange'
    });
    const onSubmit = (isSaveAndAdd: boolean) =>
      forms.handleSubmit((data) => onValid(isSaveAndAdd, data))();

    const mode = options.mode ?? 'add';
    // Forms use two conventions: a `mode` string and/or boolean flags. Pass both.
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <FormErrorProvider>
            <FormComponent
              forms={forms}
              onSubmit={onSubmit}
              mode={mode}
              addMode={mode === 'add'}
              editMode={mode === 'edit'}
              viewMode={mode === 'view'}
              deleteMode={mode === 'delete'}
              handleClose={handleClose}
              isLoadingCreate={false}
              isLoadingUpdate={false}
              isLoadingDelete={false}
              popOver={true}
              setPopOver={setPopOver}
              {...(options.props ?? {})}
            />
          </FormErrorProvider>
        </QueryClientProvider>
      </Provider>
    );
  };

  render(<Wrapper />);
  return { onValid, handleClose, setPopOver, store };
}

export { screen, waitFor, within, userEvent };
export { buildValidObject } from '@/lib/test-utils/schemaContract';
