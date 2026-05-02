from datetime import datetime, timedelta

def get_period_str(dt: datetime, granularity: str) -> str:
    if granularity == 'weekly':
        y, w, d = dt.isocalendar()
        return f"{y:04d}-W{w:02d}"
    elif granularity == 'yearly':
        return dt.strftime('%Y')
    else: # monthly
        return dt.strftime('%Y-%m')

def step_backward(dt: datetime, granularity: str) -> datetime:
    if granularity == 'weekly':
        return dt - timedelta(days=7)
    elif granularity == 'yearly':
        try:
            return dt.replace(year=dt.year - 1)
        except ValueError:
            return dt.replace(year=dt.year - 1, day=28)
    else: # monthly
        m = dt.month - 1
        y = dt.year
        if m == 0:
            m = 12
            y -= 1
        try:
            return dt.replace(year=y, month=m)
        except ValueError:
            return dt.replace(year=y, month=m, day=28)

def step_forward(dt: datetime, granularity: str) -> datetime:
    if granularity == 'weekly':
        return dt + timedelta(days=7)
    elif granularity == 'yearly':
        try:
            return dt.replace(year=dt.year + 1)
        except ValueError:
            return dt.replace(year=dt.year + 1, day=28)
    else: # monthly
        m = dt.month + 1
        y = dt.year
        if m == 13:
            m = 1
            y += 1
        try:
            return dt.replace(year=y, month=m)
        except ValueError:
            return dt.replace(year=y, month=m, day=28)

def format_period_label(p_str: str, granularity: str) -> str:
    if granularity == 'weekly':
        # "2026-W04" -> "W04 '26"
        return f"{p_str[5:]} '{p_str[2:4]}"
    elif granularity == 'yearly':
        return p_str
    else:
        month_names = {'01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun','07':'Jul','08':'Aug','09':'Sep','10':'Oct','11':'Nov','12':'Dec'}
        return f"{month_names.get(p_str[5:7], '')} {p_str[:4]}"
