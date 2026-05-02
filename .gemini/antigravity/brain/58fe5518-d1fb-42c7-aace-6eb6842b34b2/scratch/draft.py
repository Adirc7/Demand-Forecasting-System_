from datetime import datetime, timedelta, date

def get_period(target_date: datetime, granularity: str) -> str:
    if granularity == 'weekly':
        y, w, d = target_date.isocalendar()
        return f"{y:04d}-W{w:02d}"
    elif granularity == 'yearly':
        return target_date.strftime('%Y')
    else: # monthly
        return target_date.strftime('%Y-%m')

def step_backward(target_date: datetime, granularity: str) -> datetime:
    if granularity == 'weekly':
        return target_date - timedelta(days=7)
    elif granularity == 'yearly':
        try:
            return target_date.replace(year=target_date.year - 1)
        except ValueError:
            return target_date.replace(year=target_date.year - 1, day=28)
    else: # monthly
        m = target_date.month - 1
        y = target_date.year
        if m == 0:
            m = 12
            y -= 1
        try:
            return target_date.replace(year=y, month=m)
        except ValueError:
            return target_date.replace(year=y, month=m, day=28)

def step_forward(target_date: datetime, granularity: str) -> datetime:
    if granularity == 'weekly':
        return target_date + timedelta(days=7)
    elif granularity == 'yearly':
        try:
            return target_date.replace(year=target_date.year + 1)
        except ValueError:
            return target_date.replace(year=target_date.year + 1, day=28)
    else: # monthly
        m = target_date.month + 1
        y = target_date.year
        if m == 13:
            m = 1
            y += 1
        try:
            return target_date.replace(year=y, month=m)
        except ValueError:
            return target_date.replace(year=y, month=m, day=28)

def print_hello():
    print("Draft file created successfully")

if __name__ == "__main__":
    print_hello()
