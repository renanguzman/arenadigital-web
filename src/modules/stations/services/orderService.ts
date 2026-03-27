import { supabase } from "@/shared/database/supabaseClient";
import { FinanceService } from "@/modules/finance/services/financeService";
import { StationService } from "@/modules/stations/services/stationService";

export interface StationOrder {
    id: string;
    arena_id: string;
    station_id: string;
    atleta_id?: string;
    customer_id?: string;
    order_number: number;
    customer_name?: string;
    status: 'open' | 'closed' | 'cancelled';
    total_value: number;
    created_at: string;
    updated_at: string;
    closed_at?: string;
    station_order_items?: StationOrderItem[];
    station_payments?: StationOrderPayment[];
    atleta?: {
        nome_perfil: string;
    };
    station_customer?: {
        name: string;
    };
}

export interface StationOrderPayment {
    id: string;
    order_id: string;
    paid_by_name?: string;
    payment_method: string;
    observation?: string;
    amount: number;
    created_at: string;
}

export interface StationOrderItem {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    created_at: string;
    product?: {
        name: string;
    };
}

export class OrderService {
    static async getOrdersByStation(stationId: string) {
        const { data, error } = await supabase
            .from('station_orders')
            .select(`
                *,
                atleta:atleta(nome_perfil),
                station_order_items(
                    *,
                    product:products(name)
                )
            `)
            .eq('station_id', stationId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching station orders:', error);
            throw error;
        }

        return data as StationOrder[];
    }

    static async createOrder(input: Partial<StationOrder>) {
        const { data, error } = await supabase
            .from('station_orders')
            .insert([input])
            .select()
            .single();

        if (error) {
            console.error('Error creating station order:', error);
            throw error;
        }

        return data as StationOrder;
    }

    static async updateOrder(id: string, input: Partial<StationOrder>) {
        const { data, error } = await supabase
            .from('station_orders')
            .update(input)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating station order:', error);
            throw error;
        }

        return data as StationOrder;
    }

    static async addOrderItem(input: Partial<StationOrderItem>) {
        const { data, error } = await supabase
            .from('station_order_items')
            .insert([input])
            .select()
            .single();

        if (error) {
            console.error('Error adding order item:', error);
            throw error;
        }

        return data as StationOrderItem;
    }

    static async createOrderWithItems(
        orderInput: Partial<StationOrder>,
        items: { product_id: string; quantity: number; unit_price: number; total_price: number }[]
    ) {
        // Create the order first
        const order = await this.createOrder(orderInput);

        // Then create the items
        if (items.length > 0) {
            const itemsInput = items.map(item => ({
                ...item,
                order_id: order.id
            }));

            const { data: insertedItems, error: itemsError } = await supabase
                .from('station_order_items')
                .insert(itemsInput)
                .select();

            if (itemsError) {
                console.error('Error creating order items:', itemsError);
                throw itemsError;
            }
            return { order, items: insertedItems as StationOrderItem[] };
        }
        return { order, items: [] };
    }

    static async addOrderItems(orderId: string, items: { product_id: string; quantity: number; unit_price: number; total_price: number }[]) {
        if (items.length === 0) return [];

        const itemsInput = items.map(item => ({
            ...item,
            order_id: orderId
        }));

        const { data, error } = await supabase
            .from('station_order_items')
            .insert(itemsInput)
            .select();

        if (error) {
            console.error('Error adding order items:', error);
            throw error;
        }

        return data as StationOrderItem[];
    }

    static async getOrderById(id: string) {
        const { data, error } = await supabase
            .from('station_orders')
            .select(`
                *,
                atleta:atleta(nome_perfil),
                station_customer:station_customers(name),
                station_order_items(
                    *,
                    product:products(name)
                ),
                station_payments(*)
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching station order details:', error);
            throw error;
        }

        return data as StationOrder;
    }

    static async addPayment(input: Partial<StationOrderPayment>) {
        const { data, error } = await supabase
            .from('station_payments')
            .insert([input])
            .select()
            .single();

        if (error) {
            console.error('Error adding station payment:', error);
            throw error;
        }

        return data as StationOrderPayment;
    }

    static async closeOrderAndGenerateFinance(orderId: string, registeredByUserId: string) {
        const now = new Date().toISOString();
        
        // 1. Close the order
        const { error: orderError } = await supabase
            .from('station_orders')
            .update({ status: 'closed', closed_at: now })
            .eq('id', orderId);

        if (orderError) {
            console.error('Error closing order:', orderError);
            throw orderError;
        }

        // 2. Fetch order details to get payments
        const order = await this.getOrderById(orderId);

        if (!order || !order.station_payments || order.station_payments.length === 0) {
            return order;
        }

        // 3. Fetch payment methods
        const { data: dbPaymentMethods, error: pmError } = await supabase
            .from('modo_pagamento')
            .select('id, nome');
            
        if (pmError) {
            console.error('Error fetching payment methods:', pmError);
            throw pmError;
        }

        // 4. Fetch the specific station type to use for categorization
        let stationTypeName = 'Bar';
        try {
            const station = await StationService.getStationById(order.station_id);
            if (station?.station_type?.name) {
                stationTypeName = station.station_type.name;
            }
        } catch (err) {
            console.error('Could not fetch station type, fallback to Bar', err);
        }

        // 5. Create financial transactions
        for (const payment of order.station_payments) {
            const matchedMethod = dbPaymentMethods?.find(
                pm => pm.nome.toLowerCase() === payment.payment_method.toLowerCase()
            );

            let description = `${stationTypeName} - Comanda #${order.order_number.toString().padStart(3, '0')}`;
            if (payment.observation) description += ` - ${payment.observation}`;
            if (payment.paid_by_name) description += ` (Pago por: ${payment.paid_by_name})`;

            await FinanceService.createTransaction({
                arena_id: order.arena_id,
                type: 'entrada',
                category: stationTypeName,
                description,
                quantity: 1,
                unit_value: payment.amount,
                discount: 0,
                total_value: payment.amount,
                registration_date: now,
                launch_date: now,
                registered_by: registeredByUserId,
                atleta_id: order.atleta_id || null,
                modo_pagamento_id: matchedMethod?.id || null,
            });
        }

        return order;
    }

    static async getStationMetrics(stationId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // 1. Pending (all time)
        const { count: pendingCount, error: pendingError } = await supabase
            .from('station_orders')
            .select('*', { count: 'exact', head: true })
            .eq('station_id', stationId)
            .eq('status', 'open');

        // 2. Closed today
        const { count: closedTodayCount, error: closedTodayError } = await supabase
            .from('station_orders')
            .select('*', { count: 'exact', head: true })
            .eq('station_id', stationId)
            .eq('status', 'closed')
            .gte('closed_at', todayISO);

        // 3. Opened today (still open)
        const { count: openedTodayCount, error: openedTodayError } = await supabase
            .from('station_orders')
            .select('*', { count: 'exact', head: true })
            .eq('station_id', stationId)
            .eq('status', 'open')
            .gte('created_at', todayISO);

        if (pendingError || closedTodayError || openedTodayError) {
            console.error('Error fetching station metrics:', { pendingError, closedTodayError, openedTodayError });
        }

        return {
            pending: pendingCount || 0,
            closedToday: closedTodayCount || 0,
            openedToday: openedTodayCount || 0
        };
    }
}
