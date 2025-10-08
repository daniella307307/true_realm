export const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString(); // You can customize the format as needed
};