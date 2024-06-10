
export const calculateItemAmount = (po_rate: any, itemQuantity: any) => {

    const poRate = parseInt(po_rate?.toString() ?? '0', 10);
    const quantity = parseInt(itemQuantity?.toString() ?? '1', 10);

    const amount = poRate * quantity;

    return amount;
}