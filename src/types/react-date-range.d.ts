declare module "react-date-range" {
  import * as React from "react";
  import { Locale } from "date-fns";

  export interface Range {
    startDate?: Date;
    endDate?: Date;
    key?: string;
  }

  export interface RangeKeyDict {
    [key: string]: Range;
  }

  export interface DateRangeProps {
    ranges: Range[];
    onChange: (ranges: RangeKeyDict) => void;
    showSelectionPreview?: boolean;
    moveRangeOnFirstSelection?: boolean;
    months?: number;
    direction?: "vertical" | "horizontal";
    rangeColors?: string[];
    editableDateInputs?: boolean;
    locale?: Locale;
    className?: string;
  }

  export class DateRangePicker extends React.Component<DateRangeProps> {}
  export class DateRange extends React.Component<DateRangeProps> {}
}
