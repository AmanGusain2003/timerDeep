export const toLocalDateString = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const parseLocalDateString = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export const addDaysToDateString = (dateStr: string, deltaDays: number): string => {
    const date = parseLocalDateString(dateStr);
    date.setDate(date.getDate() + deltaDays);
    return toLocalDateString(date);
};
