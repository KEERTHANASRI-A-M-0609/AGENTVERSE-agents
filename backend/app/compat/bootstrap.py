"""
Install a numpy-backed pandas substitute when native pandas DLLs are blocked
(e.g. Windows Smart App Control).
"""
from __future__ import annotations

import sys
import types


def install_pandas_shim() -> None:
    existing = sys.modules.get("pandas")
    if existing is not None and getattr(existing, "__shopmind_shim__", False):
        return

    try:
        import pandas as pd  # noqa: F401

        # Force native extension load; import alone is not always enough.
        _ = pd.Timestamp("2020-01-01")
        return
    except Exception:
        # Partial failed imports must be cleared before installing the shim.
        for name in list(sys.modules):
            if name == "pandas" or name.startswith("pandas."):
                del sys.modules[name]

    from app.compat import pandas_lite as shim

    module = types.ModuleType("pandas")
    module.DataFrame = shim.DataFrame
    module.Series = shim.Series
    module.Timestamp = shim.Timestamp
    module.to_datetime = shim.to_datetime
    module.to_numeric = shim.to_numeric
    module.date_range = shim.date_range
    module.read_csv = shim.read_csv
    module.isna = shim.isna
    module.NaT = None
    module.NA = None
    module.__shopmind_shim__ = True
    module.__version__ = "0.0.0+shopmind-shim"
    sys.modules["pandas"] = module
