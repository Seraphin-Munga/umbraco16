// Shared Tailwind utility strings for GetAQuote's modals and form controls.
// Ported from GetAQuote.css (a verbatim copy of Platform/Web/css/
// newqqstyle.css plus this port's own additions) so every modal/input here
// no longer depends on that standalone stylesheet or on the Bootstrap-named
// classes (.container/.row/.col-*, .btn, .input-group, .glyphicon-*) it and
// the TSX markup used to rely on. Pulled into one file since the same
// composite strings repeat across every modal in this folder.

export const modalOverlay =
  'fixed inset-0 z-[1000] flex items-center justify-center bg-black/50';

export const modalDialog =
  'rounded-[32px] bg-[#fff] p-10 sm:px-[50px] max-sm:mx-2.5 max-sm:w-[calc(100%-20px)] max-sm:p-2.5';

export const modalHeader = 'flex items-center justify-end';

export const modalBody = 'grid justify-center px-5 text-center text-sm';

export const modalFooter =
  'mt-5 flex justify-center gap-2.5 max-sm:grid [&>button]:min-w-[180px]';

export const modalCloseButton =
  'h-7 w-7 cursor-pointer border-none bg-transparent p-0 text-xl leading-none text-brand-navy';

export const modalTitle = 'mb-5 mt-[15px] text-2xl font-bold text-brand-navy';

// Home.css sets a bare `button { text-transform: uppercase }` app-wide (no
// per-route CSS scoping here); normal-case! keeps GetAQuote's buttons in
// their intended mixed case regardless of load order.
const btnBase =
  "inline-flex items-center justify-center whitespace-nowrap rounded-[32px] px-8 py-3.5 text-center font-medium normal-case! transition-[background-color,transform,box-shadow] duration-300 disabled:cursor-not-allowed disabled:bg-[#ccc] disabled:text-white disabled:opacity-100 disabled:hover:translate-y-0 disabled:hover:bg-[#ccc] disabled:hover:shadow-none";

export const btnPrimary = `${btnBase} bg-[#5DC300] text-white hover:-translate-y-0.5 hover:bg-[#52AD00] hover:shadow-[4px_7px_12px_rgba(0,0,0,0.2)]`;

export const btnTertiary = `${btnBase} bg-[#f2f2f2] text-brand-navy shadow-[2px_5px_10px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 hover:bg-[#f2f2f2] hover:shadow-[4px_7px_12px_rgba(0,0,0,0.2)]`;

export const inputField =
  'w-full rounded-[32px] border-2 border-[#DBDBDB] bg-[#F8F7F8] px-[25px] py-[15px] text-sm text-[#3D565F] outline-none placeholder:text-[#424242] focus:border-brand-navy focus:bg-[#f2f5f7] focus:text-brand-navy focus:shadow-[0_0_0_0.2rem_rgba(0,123,255,0.25)] focus:outline-none';

export const selectField =
  'w-full appearance-none rounded-[32px] border-2 border-[#e5eaef] bg-[#F2F5F7] px-[25px] py-[16.5px] pr-10 text-sm text-brand-navy outline-none';

export const fieldLabel = 'mb-[5px] mt-[15px] block text-sm font-bold text-brand-navy';

// Hover tooltip bubble driven by a `data-tooltip="..."` attribute on the
// trigger element. Written as fully static class strings (not built from
// interpolated variables) since Tailwind's build-time scanner only detects
// classes that appear as literal, complete tokens in source.
const tooltipTriggerBase =
  'relative inline-block cursor-help text-sm font-medium leading-none text-brand-navy ' +
  "after:absolute after:bottom-[51%] after:left-[77%] after:z-[1000] after:w-[280px] after:rounded-2xl after:border after:border-[#1C619D] after:bg-[#fff] after:p-2.5 after:text-xs after:leading-[1.4] after:whitespace-normal after:text-[#1C619D] after:opacity-0 after:invisible after:transition-opacity after:duration-[250ms] after:content-[attr(data-tooltip)] " +
  "before:absolute before:bottom-[115%] before:left-1/2 before:-translate-x-1/2 before:border-[6px] before:border-solid before:border-t-brand-navy before:border-x-transparent before:border-b-transparent before:opacity-0 before:invisible before:transition-opacity before:duration-[250ms] before:content-[''] " +
  'hover:after:opacity-100 hover:after:visible hover:before:opacity-100 hover:before:visible';

// Default: bubble centered under the trigger, 95px tall (matches .tooltip).
export const tooltipClass = `${tooltipTriggerBase} after:h-[95px] after:-translate-x-1/2`;

// OffersStep's card-footer tooltip: same height, but the bubble is anchored
// further left (-20%) so it doesn't run off the narrow product card.
export const tooltipCardClass = `${tooltipTriggerBase} after:h-[95px] after:-translate-x-[20%]`;

// PersonalDetailsStep's employment-sector tooltip (matches .tooltip-wrapper,
// which is 80px tall and takes the full width of its wrapper).
export const tooltipWrapperClass = `w-full ${tooltipTriggerBase} after:h-[80px] after:-translate-x-1/2`;
