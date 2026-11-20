import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';
import { getBtn, saveButton } from '@/lib/test-utils/formHarness';

type LookupState = 'resolving' | 'unresolved';

const setup = (lookupState?: LookupState) => {
  const onSave = jest.fn();
  const onSaveAndAdd = jest.fn();
  const onCancel = jest.fn();
  render(
    <div role="dialog">
      <input
        data-testid="lookup"
        data-lookup-state={lookupState}
        onChange={() => {}}
      />
      <FormFooterButtons
        mode="add"
        onSave={onSave}
        onSaveAndAdd={onSaveAndAdd}
        onCancel={onCancel}
      />
    </div>
  );
  const lookup = screen.getByTestId('lookup') as HTMLInputElement;
  const saveAndAddButton = () => getBtn('SAVE & ADD');
  return { onSave, onSaveAndAdd, lookup, saveButton, saveAndAddButton };
};

describe('FormFooterButtons lookup guard', () => {
  test('saves synchronously when no lookup is pending', () => {
    const { onSave, saveButton } = setup();
    fireEvent.click(saveButton());
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test('blocks save and focuses the lookup that stays unresolved', async () => {
    const { onSave, lookup, saveButton } = setup('unresolved');
    fireEvent.click(saveButton());
    await waitFor(() => expect(lookup).toHaveFocus());
    expect(onSave).not.toHaveBeenCalled();
  });

  test('asks unresolved lookups to resolve, then saves once they do', () => {
    const { onSave, lookup, saveButton } = setup('unresolved');
    lookup.addEventListener('lookup:resolve', () =>
      lookup.removeAttribute('data-lookup-state')
    );
    fireEvent.click(saveButton());
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test('waits for a resolving lookup before saving', async () => {
    const { onSave, lookup, saveButton } = setup('resolving');
    fireEvent.click(saveButton());
    expect(onSave).not.toHaveBeenCalled();
    lookup.removeAttribute('data-lookup-state');
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  });

  test('ignores a second click while waiting for a lookup', async () => {
    const { onSave, lookup, saveButton } = setup('resolving');
    fireEvent.click(saveButton());
    fireEvent.click(saveButton());
    lookup.removeAttribute('data-lookup-state');
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  });

  test('guards SAVE & ADD the same way', async () => {
    const { onSave, onSaveAndAdd, lookup, saveAndAddButton } =
      setup('unresolved');
    fireEvent.click(saveAndAddButton());
    await waitFor(() => expect(lookup).toHaveFocus());
    expect(onSaveAndAdd).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();

    lookup.removeAttribute('data-lookup-state');
    fireEvent.click(saveAndAddButton());
    expect(onSaveAndAdd).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  test('Alt+S goes through the guard', async () => {
    const { onSave, lookup } = setup('unresolved');
    fireEvent.keyDown(document, { key: 's', altKey: true });
    await waitFor(() => expect(lookup).toHaveFocus());
    expect(onSave).not.toHaveBeenCalled();

    lookup.removeAttribute('data-lookup-state');
    fireEvent.keyDown(document, { key: 's', altKey: true });
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
