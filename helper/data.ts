// TODO: Figure out how to keep variables up-to-date
// TODO: Migrate helper to vue3-ui

export const context = {
  position: undefined,
  size: undefined,
  type: undefined,
  newType: undefined,
  closeType: undefined,
  passiveType: undefined,
  customClass: undefined,
  navClasses: undefined,
  spanClasses: undefined,
  rootClasses: undefined,
  inputClasses: undefined,
};

export const truthy = {
  tabs: { activeTab: true },
  t: { disabled: true },
  closeIcon: true,
  ellipsis: true,
  disabled: true,
  rounded: true,
  computedRounded: true,
  loading: true,
  outlined: true,
  expanded: true,
  inverted: true,
  focused: true,
  isFocused: true,
  active: true,
  hovered: true,
  selected: true,
  square: true,
  newAnimated: true,
  newActive: true,
  newExpanded: true,
  always: true,
  multilined: true,
  dashed: true,
};

export const falsy = {
  // eslint-disable-next-line unicorn/no-reduce
  ...Object.keys(truthy).reduce((acc, k) => ({ ...acc, [k]: false }), {}),
  tabs: { activeTab: false },
  t: { disabled: false },
};
