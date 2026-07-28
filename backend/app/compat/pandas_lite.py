"""
Minimal pandas-compatible API backed by numpy + stdlib.

Used when Windows Smart App Control (or similar) blocks pandas native DLLs.
Covers only the DataFrame / Series operations this project needs.
"""
from __future__ import annotations

import csv
import math
from datetime import date, datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional, Sequence, Union

import numpy as np

__all__ = [
    "DataFrame",
    "Series",
    "Timestamp",
    "to_datetime",
    "to_numeric",
    "date_range",
    "read_csv",
    "isna",
]


def _is_na(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return True
    try:
        if value is np.nan:
            return True
    except Exception:
        pass
    try:
        return bool(np.isnan(value))
    except Exception:
        return False


def isna(value: Any) -> bool:
    return _is_na(value)


def _to_datetime_value(value: Any, errors: str = "raise") -> Optional[datetime]:
    if _is_na(value):
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    if isinstance(value, (int, float, np.integer, np.floating)):
        # treat as already-datetime-like ordinal not supported; fall through
        pass
    try:
        text = str(value).strip()
        for fmt in (
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%d-%m-%Y",
            "%d/%m/%Y",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
        ):
            try:
                return datetime.strptime(text[:19], fmt)
            except ValueError:
                continue
        return datetime.fromisoformat(text.replace("Z", "+00:00").split("+")[0])
    except Exception:
        if errors == "coerce":
            return None
        raise


class Timestamp(datetime):
    """datetime subclass with pandas-like helpers."""

    def __new__(cls, value: Any = None, *args, **kwargs):
        if value is None and not args and not kwargs:
            value = datetime.now()
        if isinstance(value, Timestamp):
            return datetime.__new__(
                cls, value.year, value.month, value.day, value.hour, value.minute, value.second, value.microsecond
            )
        if isinstance(value, datetime):
            return datetime.__new__(
                cls, value.year, value.month, value.day, value.hour, value.minute, value.second, value.microsecond
            )
        if isinstance(value, date) and not isinstance(value, datetime):
            return datetime.__new__(cls, value.year, value.month, value.day)
        if isinstance(value, str) or args or kwargs:
            if isinstance(value, str):
                parsed = _to_datetime_value(value)
                if parsed is None:
                    raise ValueError(f"Cannot parse Timestamp: {value}")
                return datetime.__new__(
                    cls, parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute, parsed.second, parsed.microsecond
                )
            return datetime.__new__(cls, value, *args, **kwargs)
        raise TypeError(f"Cannot construct Timestamp from {type(value)}")

    @property
    def dayofweek(self) -> int:
        return self.weekday()

    def date(self) -> date:  # type: ignore[override]
        return date(self.year, self.month, self.day)

    def isocalendar(self):  # type: ignore[override]
        iso = super().isocalendar()
        return (iso.year, iso.week, iso.weekday)


class _DTAccessor:
    def __init__(self, values: List[Any]):
        self._values = [_to_datetime_value(v, errors="coerce") for v in values]

    @property
    def dayofweek(self) -> "Series":
        return Series([v.weekday() if v else 0 for v in self._values])

    @property
    def month(self) -> "Series":
        return Series([v.month if v else 0 for v in self._values])

    @property
    def day(self) -> "Series":
        return Series([v.day if v else 0 for v in self._values])

    @property
    def date(self) -> "Series":
        return Series([v.date() if v else None for v in self._values])

    def isocalendar(self) -> "_ISOCalendar":
        return _ISOCalendar(self._values)


class _ISOCalendar:
    def __init__(self, values: List[Optional[datetime]]):
        self._values = values

    @property
    def week(self) -> "Series":
        return Series([v.isocalendar()[1] if v else 0 for v in self._values])


class _Rolling:
    def __init__(self, values: List[Any], window: int, min_periods: int = 1):
        self._values = [float(v) if not _is_na(v) else np.nan for v in values]
        self._window = window
        self._min_periods = min_periods

    def _apply(self, fn) -> "Series":
        out: List[Any] = []
        for i in range(len(self._values)):
            start = max(0, i - self._window + 1)
            window_vals = [v for v in self._values[start : i + 1] if not _is_na(v)]
            if len(window_vals) < self._min_periods:
                out.append(np.nan)
            else:
                out.append(fn(window_vals))
        return Series(out)

    def mean(self) -> "Series":
        return self._apply(lambda vals: float(np.mean(vals)))

    def std(self) -> "Series":
        def _std(vals: List[float]) -> float:
            if len(vals) < 2:
                return 0.0
            return float(np.std(vals, ddof=1))

        return self._apply(_std)


class Series:
    def __init__(self, data: Optional[Sequence[Any]] = None, name: Optional[str] = None):
        self._data: List[Any] = list(data) if data is not None else []
        self.name = name

    def __len__(self) -> int:
        return len(self._data)

    def __iter__(self):
        return iter(self._data)

    def __getitem__(self, key):
        if isinstance(key, slice):
            return Series(self._data[key], name=self.name)
        return self._data[key]

    def __setitem__(self, key, value):
        self._data[key] = value

    @property
    def values(self) -> np.ndarray:
        return np.array(self._data, dtype=object)

    @property
    def dt(self) -> _DTAccessor:
        return _DTAccessor(self._data)

    def fillna(self, value: Any = 0) -> "Series":
        return Series([value if _is_na(v) else v for v in self._data], name=self.name)

    def astype(self, dtype) -> "Series":
        if dtype is int or dtype == int or dtype == "int":
            return Series([int(float(v or 0)) for v in self._data], name=self.name)
        if dtype is float or dtype == float or dtype == "float":
            return Series([float(v or 0) for v in self._data], name=self.name)
        if dtype is bool or dtype == bool or dtype == "bool":
            return Series([bool(v) for v in self._data], name=self.name)
        if dtype is str or dtype == str or dtype == "str":
            return Series(["" if _is_na(v) else str(v) for v in self._data], name=self.name)
        return Series([dtype(v) for v in self._data], name=self.name)

    @property
    def str(self) -> "_StringMethods":
        return _StringMethods(self)

    def shift(self, periods: int = 1) -> "Series":
        if periods <= 0:
            return Series(self._data, name=self.name)
        return Series([np.nan] * periods + self._data[:-periods], name=self.name)

    def rolling(self, window: int, min_periods: int = 1) -> _Rolling:
        return _Rolling(self._data, window=window, min_periods=min_periods)

    def isin(self, values: Iterable[Any]) -> "Series":
        value_set = set(values)
        return Series([v in value_set for v in self._data], name=self.name)

    def mean(self) -> float:
        nums = [float(v) for v in self._data if not _is_na(v)]
        return float(np.mean(nums)) if nums else 0.0

    def max(self):
        vals = [v for v in self._data if not _is_na(v)]
        return max(vals) if vals else None

    def min(self):
        vals = [v for v in self._data if not _is_na(v)]
        return min(vals) if vals else None

    def unique(self) -> np.ndarray:
        seen = []
        for v in self._data:
            if v not in seen:
                seen.append(v)
        return np.array(seen, dtype=object)

    def tail(self, n: int = 5) -> "Series":
        return Series(self._data[-n:], name=self.name)

    def dropna(self) -> "Series":
        return Series([v for v in self._data if not _is_na(v)], name=self.name)

    def tolist(self) -> List[Any]:
        return list(self._data)


class _StringMethods:
    def __init__(self, series: Series):
        self._series = series

    def strip(self) -> Series:
        return Series(
            ["" if _is_na(v) else str(v).strip() for v in self._series._data],
            name=self._series.name,
        )


class DataFrame:
    def __init__(self, data: Any = None):
        self._columns: List[str] = []
        self._data: Dict[str, List[Any]] = {}

        if data is None:
            return

        if isinstance(data, DataFrame):
            self._columns = list(data._columns)
            self._data = {c: list(data._data[c]) for c in self._columns}
            return

        if isinstance(data, list):
            if not data:
                return
            if isinstance(data[0], dict):
                cols: List[str] = []
                for row in data:
                    for k in row.keys():
                        if k not in cols:
                            cols.append(k)
                self._columns = cols
                self._data = {c: [] for c in cols}
                for row in data:
                    for c in cols:
                        self._data[c].append(row.get(c))
                return
            raise TypeError("Unsupported list DataFrame input")

        if isinstance(data, dict):
            self._columns = list(data.keys())
            lengths = [len(v) for v in data.values()]
            n = max(lengths) if lengths else 0
            self._data = {}
            for c, values in data.items():
                seq = list(values)
                if len(seq) < n:
                    seq = seq + [None] * (n - len(seq))
                self._data[c] = seq
            return

        raise TypeError(f"Unsupported DataFrame input type: {type(data)}")

    @property
    def empty(self) -> bool:
        return self.shape[0] == 0

    @property
    def columns(self) -> List[str]:
        return list(self._columns)

    @property
    def shape(self):
        n_rows = len(next(iter(self._data.values()), []))
        return (n_rows, len(self._columns))

    def __len__(self) -> int:
        return self.shape[0]

    @property
    def values(self) -> np.ndarray:
        if not self._columns:
            return np.empty((0, 0))
        cols = [self._data[c] for c in self._columns]
        return np.column_stack([np.asarray(col, dtype=float) for col in cols])

    def __contains__(self, item) -> bool:
        return item in self._columns

    def __getitem__(self, key):
        if isinstance(key, list):
            out = DataFrame()
            out._columns = list(key)
            out._data = {c: list(self._data.get(c, [None] * len(self))) for c in key}
            return out
        if key not in self._data:
            raise KeyError(key)
        return Series(self._data[key], name=key)

    def __setitem__(self, key: str, value: Any):
        n = len(self)
        if isinstance(value, Series):
            vals = list(value._data)
        elif isinstance(value, (list, tuple, np.ndarray)):
            vals = list(value)
        else:
            vals = [value] * (n if n else 1)
            if n == 0:
                # creating first column
                self._columns = [key] if key not in self._columns else self._columns
                self._data[key] = vals
                if key not in self._columns:
                    self._columns.append(key)
                return

        if n == 0 and key not in self._data:
            pass
        elif len(vals) != n and n > 0:
            if len(vals) == 1:
                vals = vals * n
            else:
                raise ValueError("Length mismatch when setting column")

        if key not in self._columns:
            self._columns.append(key)
        self._data[key] = vals

    def copy(self) -> "DataFrame":
        return DataFrame(self)

    def sort_values(self, by: str, ascending: bool = True) -> "DataFrame":
        idx = list(range(len(self)))
        col = self._data.get(by, [None] * len(self))

        def sort_key(i: int):
            v = col[i]
            return (v is None or _is_na(v), v)

        idx.sort(key=sort_key, reverse=not ascending)
        out = DataFrame()
        out._columns = list(self._columns)
        out._data = {c: [self._data[c][i] for i in idx] for c in self._columns}
        return out

    def reset_index(self, drop: bool = False) -> "DataFrame":
        # index is not tracked separately; already positional
        return self.copy()

    def set_index(self, keys: str) -> "_IndexedFrame":
        return _IndexedFrame(self, keys)

    def rename(self, columns: Optional[Dict[str, str]] = None, inplace: bool = False) -> Optional["DataFrame"]:
        mapping = columns or {}
        target = self if inplace else self.copy()
        new_cols = []
        new_data = {}
        for c in target._columns:
            nc = mapping.get(c, c)
            new_cols.append(nc)
            new_data[nc] = target._data[c]
        target._columns = new_cols
        target._data = new_data
        return None if inplace else target

    def dropna(self, subset: Optional[Sequence[str]] = None) -> "DataFrame":
        cols = list(subset) if subset else self._columns
        keep_idx = []
        for i in range(len(self)):
            if any(_is_na(self._data[c][i]) for c in cols if c in self._data):
                continue
            keep_idx.append(i)
        out = DataFrame()
        out._columns = list(self._columns)
        out._data = {c: [self._data[c][i] for i in keep_idx] for c in self._columns}
        return out

    def drop_duplicates(self, subset: Optional[Union[str, Sequence[str]]] = None) -> "DataFrame":
        if subset is None:
            cols = self._columns
        elif isinstance(subset, str):
            cols = [subset]
        else:
            cols = list(subset)
        seen = set()
        keep_idx = []
        for i in range(len(self)):
            key = tuple(self._data[c][i] for c in cols)
            if key in seen:
                continue
            seen.add(key)
            keep_idx.append(i)
        out = DataFrame()
        out._columns = list(self._columns)
        out._data = {c: [self._data[c][i] for i in keep_idx] for c in self._columns}
        return out

    def iterrows(self):
        for i in range(len(self)):
            row = {c: self._data[c][i] for c in self._columns}
            yield i, _Row(row)


class _Row(dict):
    def __getitem__(self, key):
        return super().__getitem__(key)


class _IndexedFrame:
    def __init__(self, df: DataFrame, key: str):
        self._df = df
        self._key = key

    def reindex(self, labels: Sequence[Any], fill_value: Any = np.nan) -> DataFrame:
        key_to_idx = {}
        for i, v in enumerate(self._df._data.get(self._key, [])):
            # normalize datetime/date for lookup
            if isinstance(v, datetime):
                lookup = v.date() if hasattr(v, "date") else v
            else:
                lookup = v
            key_to_idx[lookup] = i
            key_to_idx[v] = i

        rows = []
        for label in labels:
            label_key = label.date() if isinstance(label, datetime) else label
            if label_key in key_to_idx:
                i = key_to_idx[label_key]
                row = {c: self._df._data[c][i] for c in self._df._columns}
            elif label in key_to_idx:
                i = key_to_idx[label]
                row = {c: self._df._data[c][i] for c in self._df._columns}
            else:
                row = {c: fill_value for c in self._df._columns}
                row[self._key] = label
            rows.append(row)
        return DataFrame(rows)


def to_datetime(values: Any, errors: str = "raise") -> Series:
    if isinstance(values, Series):
        raw = values._data
    elif isinstance(values, DataFrame):
        raise TypeError("to_datetime on DataFrame not supported")
    elif isinstance(values, (list, tuple, np.ndarray)):
        raw = list(values)
    else:
        raw = [values]
    converted = [_to_datetime_value(v, errors=errors) for v in raw]
    return Series(converted)


def to_numeric(values: Any, errors: str = "raise") -> Series:
    if isinstance(values, Series):
        raw = values._data
    else:
        raw = list(values)

    out = []
    for v in raw:
        if _is_na(v) or v == "":
            out.append(np.nan)
            continue
        try:
            out.append(float(v))
        except Exception:
            if errors == "coerce":
                out.append(np.nan)
            else:
                raise
    return Series(out)


def date_range(start: Any, end: Any, freq: str = "D") -> List[datetime]:
    if freq != "D":
        raise ValueError("Only daily freq is supported")
    start_dt = _to_datetime_value(start)
    end_dt = _to_datetime_value(end)
    if start_dt is None or end_dt is None:
        return []
    start_d = start_dt.date()
    end_d = end_dt.date()
    days = (end_d - start_d).days
    return [Timestamp(datetime.combine(start_d + timedelta(days=i), datetime.min.time())) for i in range(days + 1)]


def read_csv(path: Any) -> DataFrame:
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = [dict(row) for row in reader]
    return DataFrame(rows)
