# Complete Unfinished Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all unfinished e-commerce features excluding payment: orders system (backend + frontend), product search, admin order management, category edit/delete, profile order history, checkout-to-order flow, and UX cleanups.

**Architecture:** Backend adds an `OrdersController` that converts the cart to a persisted order and exposes order history endpoints; Admin gets order listing + status updates via `AdminController`. Frontend adds an order history page, admin orders page, wires checkout to the orders API, and polishes remaining rough edges (search, category management, profile, login page cleanup).

**Tech Stack:** ASP.NET Core 10 / EF Core 10 / SQLite (backend); React 19 + TypeScript + React Router 7 + plain CSS (frontend); fetch-based API service; custom i18n context (en/ka/ru).

---

## Files Overview

**Create (backend):**
- `backend/MenswearStore.Api/DTOs/OrderDtos.cs`
- `backend/MenswearStore.Api/Controllers/OrdersController.cs`

**Modify (backend):**
- `backend/MenswearStore.Api/DTOs/MappingExtensions.cs` — add `Order.ToDto()`
- `backend/MenswearStore.Api/Controllers/AdminController.cs` — add orders list + dashboard count
- `backend/MenswearStore.Api/Controllers/ProductsController.cs` — add `search` query param

**Create (frontend):**
- `frontend/src/pages/OrderHistoryPage.tsx`
- `frontend/src/pages/AdminOrdersPage.tsx`

**Modify (frontend):**
- `frontend/src/types/index.ts` — add Order, OrderItem types
- `frontend/src/services/api.ts` — add orders API calls
- `frontend/src/i18n/en.json`, `ka.json`, `ru.json` — add new translation keys
- `frontend/src/pages/CheckoutPage.tsx` — wire to orders API, clear cart on success
- `frontend/src/pages/LoginPage.tsx` — remove hardcoded credentials
- `frontend/src/pages/ProductsPage.tsx` — add search bar
- `frontend/src/pages/AdminCategoriesPage.tsx` — add edit/delete
- `frontend/src/pages/ProfilePage.tsx` — add orders link
- `frontend/src/App.tsx` — add /orders and /admin/orders routes
- `frontend/src/layouts/AdminLayout.tsx` — add Orders nav link

---

## Task 1: Backend — Order DTOs + Mapping

**Files:**
- Create: `backend/MenswearStore.Api/DTOs/OrderDtos.cs`
- Modify: `backend/MenswearStore.Api/DTOs/MappingExtensions.cs`

- [ ] **Step 1: Create OrderDtos.cs**

```csharp
// backend/MenswearStore.Api/DTOs/OrderDtos.cs
using System.ComponentModel.DataAnnotations;

namespace MenswearStore.Api.DTOs;

public record OrderItemDto(
    int Id,
    int ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    string Size,
    string Color);

public record OrderDto(
    int Id,
    string UserEmail,
    string Status,
    decimal Total,
    DateTime CreatedAtUtc,
    OrderItemDto[] Items);

public record CreateOrderRequest;

public record UpdateOrderStatusRequest([Required] string Status);
```

- [ ] **Step 2: Add Order mapping to MappingExtensions.cs**

Add this method to the existing `MappingExtensions` static class (after the `AppSetting` mapping, before the closing brace):

```csharp
    public static OrderDto ToDto(this Order order) =>
        new(
            order.Id,
            order.User?.Email ?? order.UserId,
            order.Status,
            order.Total,
            order.CreatedAtUtc,
            order.Items.Select(item => new OrderItemDto(
                item.Id, item.ProductId, item.ProductName,
                item.Quantity, item.UnitPrice, item.Size, item.Color)).ToArray());
```

- [ ] **Step 3: Verify build**

```
cd backend && dotnet build MenswearStore.Api/MenswearStore.Api.csproj
```
Expected: `Build succeeded.`

- [ ] **Step 4: Commit**

```
git add backend/MenswearStore.Api/DTOs/OrderDtos.cs backend/MenswearStore.Api/DTOs/MappingExtensions.cs
git commit -m "feat(backend): add order DTOs and mapping"
```

---

## Task 2: Backend — OrdersController

**Files:**
- Create: `backend/MenswearStore.Api/Controllers/OrdersController.cs`

- [ ] **Step 1: Create OrdersController.cs**

```csharp
// backend/MenswearStore.Api/Controllers/OrdersController.cs
using System.Security.Claims;
using MenswearStore.Api.Data;
using MenswearStore.Api.DTOs;
using MenswearStore.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController(ApplicationDbContext db) : ControllerBase
{
    private static readonly string[] ValidStatuses =
        ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create(CreateOrderRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var cart = await db.Carts
            .Include(c => c.Items).ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (cart is null || !cart.Items.Any())
            return BadRequest(new { message = "Cart is empty." });

        var order = new Order
        {
            UserId = userId,
            Status = "Pending",
            Total = cart.Items.Sum(i => i.UnitPrice * i.Quantity),
            Items = cart.Items.Select(i => new OrderItem
            {
                ProductId = i.ProductId,
                ProductName = i.Product?.Name ?? "Product",
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                Size = i.Size ?? string.Empty,
                Color = i.Color ?? string.Empty,
            }).ToList()
        };

        db.Orders.Add(order);
        db.CartItems.RemoveRange(cart.Items);
        await db.SaveChangesAsync();

        var created = await LoadOrderAsync(order.Id);
        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, created!.ToDto());
    }

    [HttpGet]
    public async Task<ActionResult<OrderDto[]>> List()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var orders = await db.Orders
            .Include(o => o.Items)
            .Include(o => o.User)
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAtUtc)
            .ToListAsync();
        return orders.Select(o => o.ToDto()).ToArray();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderDto>> GetOrder(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var isAdmin = User.IsInRole("Admin");
        var order = await LoadOrderAsync(id);

        if (order is null || (!isAdmin && order.UserId != userId))
            return NotFound();

        return order.ToDto();
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}/status")]
    public async Task<ActionResult<OrderDto>> UpdateStatus(int id, UpdateOrderStatusRequest request)
    {
        if (!ValidStatuses.Contains(request.Status))
            return BadRequest(new { message = "Invalid status. Valid values: " + string.Join(", ", ValidStatuses) });

        var order = await LoadOrderAsync(id);
        if (order is null) return NotFound();

        order.Status = request.Status;
        await db.SaveChangesAsync();
        return order.ToDto();
    }

    private Task<Order?> LoadOrderAsync(int id) =>
        db.Orders
            .Include(o => o.Items)
            .Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == id);
}
```

- [ ] **Step 2: Build and verify**

```
cd backend && dotnet build MenswearStore.Api/MenswearStore.Api.csproj
```
Expected: `Build succeeded.`

- [ ] **Step 3: Commit**

```
git add backend/MenswearStore.Api/Controllers/OrdersController.cs
git commit -m "feat(backend): add OrdersController with place/list/detail/status endpoints"
```

---

## Task 3: Backend — Admin Orders + Dashboard Update

**Files:**
- Modify: `backend/MenswearStore.Api/Controllers/AdminController.cs`

- [ ] **Step 1: Update AdminController.cs**

Replace the full file content:

```csharp
// backend/MenswearStore.Api/Controllers/AdminController.cs
using MenswearStore.Api.Data;
using MenswearStore.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MenswearStore.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public class AdminController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult> Dashboard()
    {
        var productCount = await db.Products.CountAsync();
        var activeProducts = await db.Products.CountAsync(product => product.IsActive);
        var categoryCount = await db.Categories.CountAsync();
        var carts = await db.Carts.CountAsync();
        var orderCount = await db.Orders.CountAsync();
        var togglesEnabled = await db.AppSettings.CountAsync(setting => setting.IsEnabled);

        return Ok(new { productCount, activeProducts, categoryCount, carts, orderCount, togglesEnabled });
    }

    [HttpGet("orders")]
    public async Task<ActionResult<OrderDto[]>> Orders()
    {
        var orders = await db.Orders
            .Include(o => o.Items)
            .Include(o => o.User)
            .OrderByDescending(o => o.CreatedAtUtc)
            .ToListAsync();
        return orders.Select(o => o.ToDto()).ToArray();
    }
}
```

- [ ] **Step 2: Build and verify**

```
cd backend && dotnet build MenswearStore.Api/MenswearStore.Api.csproj
```
Expected: `Build succeeded.`

- [ ] **Step 3: Commit**

```
git add backend/MenswearStore.Api/Controllers/AdminController.cs
git commit -m "feat(backend): add admin orders list and orderCount to dashboard"
```

---

## Task 4: Backend — Product Search

**Files:**
- Modify: `backend/MenswearStore.Api/Controllers/ProductsController.cs`

- [ ] **Step 1: Add search param to GetProducts**

In `ProductsController.cs`, change the `GetProducts` method signature and add a search filter. Replace lines 15–34:

```csharp
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> GetProducts(
        GenderTarget gender = GenderTarget.Men,
        int? categoryId = null,
        bool includeInactive = false,
        string? search = null)
    {
        var query = ProductQuery().Where(product => product.GenderTarget == gender);

        if (!User.IsInRole("Admin") || !includeInactive)
        {
            query = query.Where(product => product.IsActive);
        }

        if (categoryId.HasValue)
        {
            query = query.Where(product => product.CategoryId == categoryId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(product =>
                product.Name.ToLower().Contains(term) ||
                product.Description.ToLower().Contains(term));
        }

        var products = await query.OrderByDescending(product => product.CreatedAtUtc).ToListAsync();
        return products.Select(product => product.ToDto()).ToArray();
    }
```

- [ ] **Step 2: Build and verify**

```
cd backend && dotnet build MenswearStore.Api/MenswearStore.Api.csproj
```
Expected: `Build succeeded.`

- [ ] **Step 3: Commit**

```
git add backend/MenswearStore.Api/Controllers/ProductsController.cs
git commit -m "feat(backend): add search query param to GET /api/products"
```

---

## Task 5: Frontend — Types + API Service

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Add Order types to types/index.ts**

Append to the end of the file:

```typescript
export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  size: string;
  color: string;
}

export interface Order {
  id: number;
  userEmail: string;
  status: OrderStatus;
  total: number;
  createdAtUtc: string;
  items: OrderItem[];
}
```

- [ ] **Step 2: Add orders calls to api.ts**

In `api.ts`, update the import line to include `Order`:
```typescript
import type { AppSetting, AuthResponse, Category, GenderTarget, Order, Product } from '../types';
```

Update the `products` call to support `search`:
```typescript
  products: (gender: GenderTarget = 0, includeInactive = false, search?: string) => {
    const params = new URLSearchParams({ gender: String(gender), includeInactive: String(includeInactive) });
    if (search) params.set('search', search);
    return request<Product[]>(`/api/products?${params}`);
  },
```

Add these order calls to the `api` object (before the closing `}`):
```typescript
  placeOrder: () =>
    request<Order>('/api/orders', { method: 'POST', body: '{}' }),
  orders: () => request<Order[]>('/api/orders'),
  adminOrders: () => request<Order[]>('/api/admin/orders'),
  updateOrderStatus: (id: number, status: string) =>
    request<Order>(`/api/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
```

- [ ] **Step 3: Commit**

```
git add frontend/src/types/index.ts frontend/src/services/api.ts
git commit -m "feat(frontend): add Order types and orders API service calls"
```

---

## Task 6: Frontend — i18n Keys

**Files:**
- Modify: `frontend/src/i18n/en.json`
- Modify: `frontend/src/i18n/ka.json`
- Modify: `frontend/src/i18n/ru.json`

- [ ] **Step 1: Add keys to en.json**

Add these entries before the closing `}`:

```json
  "orders": "Orders",
  "myOrders": "My orders",
  "orderHistory": "Order history",
  "orderId": "Order #",
  "orderDate": "Date",
  "orderStatus": "Status",
  "orderTotal": "Total",
  "orderItems": "Items",
  "placeOrder": "Place order",
  "orderPlaced": "Order placed successfully!",
  "noOrders": "No orders yet.",
  "viewOrders": "View my orders",
  "orderManagement": "Order management",
  "allOrders": "All orders",
  "updateStatus": "Update status",
  "searchProducts": "Search products...",
  "editCategory": "Edit",
  "deleteCategory": "Delete",
  "pending": "Pending",
  "processing": "Processing",
  "shipped": "Shipped",
  "delivered": "Delivered",
  "cancelled": "Cancelled"
```

- [ ] **Step 2: Add keys to ka.json**

Add these entries before the closing `}`:

```json
  "orders": "შეკვეთები",
  "myOrders": "ჩემი შეკვეთები",
  "orderHistory": "შეკვეთების ისტორია",
  "orderId": "შეკვეთა #",
  "orderDate": "თარიღი",
  "orderStatus": "სტატუსი",
  "orderTotal": "სულ",
  "orderItems": "პუნქტები",
  "placeOrder": "შეკვეთა",
  "orderPlaced": "შეკვეთა წარმატებით გაფორმდა!",
  "noOrders": "შეკვეთები არ არის.",
  "viewOrders": "ჩემი შეკვეთების ნახვა",
  "orderManagement": "შეკვეთების მართვა",
  "allOrders": "ყველა შეკვეთა",
  "updateStatus": "სტატუსის განახლება",
  "searchProducts": "პროდუქტის ძიება...",
  "editCategory": "რედაქტირება",
  "deleteCategory": "წაშლა",
  "pending": "მოლოდინში",
  "processing": "მუშავდება",
  "shipped": "გაგზავნილია",
  "delivered": "მიტანილია",
  "cancelled": "გაუქმებულია"
```

- [ ] **Step 3: Add keys to ru.json**

Add these entries before the closing `}`:

```json
  "orders": "Заказы",
  "myOrders": "Мои заказы",
  "orderHistory": "История заказов",
  "orderId": "Заказ #",
  "orderDate": "Дата",
  "orderStatus": "Статус",
  "orderTotal": "Итого",
  "orderItems": "Позиции",
  "placeOrder": "Оформить заказ",
  "orderPlaced": "Заказ успешно оформлен!",
  "noOrders": "Заказов пока нет.",
  "viewOrders": "Мои заказы",
  "orderManagement": "Управление заказами",
  "allOrders": "Все заказы",
  "updateStatus": "Обновить статус",
  "searchProducts": "Поиск товаров...",
  "editCategory": "Изменить",
  "deleteCategory": "Удалить",
  "pending": "В ожидании",
  "processing": "В обработке",
  "shipped": "Отправлено",
  "delivered": "Доставлено",
  "cancelled": "Отменено"
```

- [ ] **Step 4: Commit**

```
git add frontend/src/i18n/en.json frontend/src/i18n/ka.json frontend/src/i18n/ru.json
git commit -m "feat(frontend): add i18n keys for orders and other missing features"
```

---

## Task 7: Frontend — Order History Page

**Files:**
- Create: `frontend/src/pages/OrderHistoryPage.tsx`

- [ ] **Step 1: Create OrderHistoryPage.tsx**

```tsx
// frontend/src/pages/OrderHistoryPage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Order } from '../types';
import { money } from '../utils/format';

export function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    api.orders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <section className="section order-history-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t('customerProfile')}</p>
          <h1>{t('orderHistory')}</h1>
        </div>
        <Link className="btn btn-outline" to="/profile">{t('profile')}</Link>
      </div>
      {orders.length === 0 ? (
        <div className="empty-state">
          <p>{t('noOrders')}</p>
          <Link className="btn btn-dark" to="/products">{t('continueShopping')}</Link>
        </div>
      ) : (
        <div className="order-list">
          {orders.map(order => (
            <article className="order-card" key={order.id}>
              <header className="order-card-header">
                <strong>{t('orderId')}{order.id}</strong>
                <span className={`order-status status-${order.status.toLowerCase()}`}>{t(order.status.toLowerCase() as never)}</span>
                <span>{new Date(order.createdAtUtc).toLocaleDateString()}</span>
                <strong>{money(order.total)}</strong>
              </header>
              <ul className="order-items">
                {order.items.map(item => (
                  <li key={item.id}>
                    {item.productName} × {item.quantity}
                    {item.size && <span> · {item.size}</span>}
                    {item.color && <span> · {item.color}</span>}
                    <span> — {money(item.unitPrice * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Add CSS for order history** (append to `frontend/src/styles/global.css`)

```css
/* Order History */
.order-list { display: flex; flex-direction: column; gap: 1.5rem; }
.order-card { border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.order-card-header { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; background: var(--paper); flex-wrap: wrap; }
.order-card-header strong:first-child { flex: 1; }
.order-items { list-style: none; padding: 1rem 1.25rem; margin: 0; display: flex; flex-direction: column; gap: .5rem; font-size: .9rem; color: var(--muted); }
.order-status { padding: .25rem .6rem; border-radius: 4px; font-size: .78rem; font-weight: 600; text-transform: uppercase; letter-spacing: .03em; }
.status-pending { background: #fef3c7; color: #92400e; }
.status-processing { background: #dbeafe; color: #1e40af; }
.status-shipped { background: #ede9fe; color: #5b21b6; }
.status-delivered { background: #d1fae5; color: #065f46; }
.status-cancelled { background: #fee2e2; color: #991b1b; }
.empty-state { text-align: center; padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; color: var(--muted); }
```

- [ ] **Step 3: Commit**

```
git add frontend/src/pages/OrderHistoryPage.tsx frontend/src/styles/global.css
git commit -m "feat(frontend): add OrderHistoryPage with order list and status badges"
```

---

## Task 8: Frontend — Admin Orders Page

**Files:**
- Create: `frontend/src/pages/AdminOrdersPage.tsx`

- [ ] **Step 1: Create AdminOrdersPage.tsx**

```tsx
// frontend/src/pages/AdminOrdersPage.tsx
import { useEffect, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Order, OrderStatus } from '../types';
import { money } from '../utils/format';

const STATUSES: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  const load = () =>
    api.adminOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const changeStatus = async (id: number, status: OrderStatus) => {
    try {
      const updated = await api.updateOrderStatus(id, status);
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
    } catch {
      // status update failed silently
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="admin-heading">
        <p className="eyebrow">{t('orderManagement')}</p>
        <h1>{t('allOrders')}</h1>
      </div>
      {orders.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>{t('noOrders')}</p>
      ) : (
        <div className="admin-table">
          {orders.map(order => (
            <article className="admin-row admin-order-row" key={order.id}>
              <div className="admin-order-info">
                <strong>{t('orderId')}{order.id}</strong>
                <span>{order.userEmail}</span>
                <span>{new Date(order.createdAtUtc).toLocaleDateString()}</span>
                <span>{order.items.length} {t('orderItems')}</span>
                <strong>{money(order.total)}</strong>
              </div>
              <div className="admin-order-status">
                <span className={`order-status status-${order.status.toLowerCase()}`}>{t(order.status.toLowerCase() as never)}</span>
                <select
                  value={order.status}
                  onChange={e => changeStatus(order.id, e.target.value as OrderStatus)}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{t(s.toLowerCase() as never)}</option>)}
                </select>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add admin order row CSS** (append to `frontend/src/styles/global.css`)

```css
/* Admin Orders */
.admin-order-row { flex-direction: column; gap: .75rem; align-items: flex-start; }
.admin-order-info { display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; width: 100%; }
.admin-order-info strong:first-child { flex: 1; }
.admin-order-status { display: flex; align-items: center; gap: 1rem; }
.admin-order-status select { padding: .35rem .6rem; border: 1px solid var(--line); border-radius: 4px; font-size: .875rem; }
```

- [ ] **Step 3: Commit**

```
git add frontend/src/pages/AdminOrdersPage.tsx frontend/src/styles/global.css
git commit -m "feat(frontend): add AdminOrdersPage with inline status update"
```

---

## Task 9: Frontend — Checkout to Order Flow

**Files:**
- Modify: `frontend/src/pages/CheckoutPage.tsx`

- [ ] **Step 1: Replace CheckoutPage.tsx**

```tsx
// frontend/src/pages/CheckoutPage.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import { money } from '../utils/format';

export function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { lines, total, clear } = useCart();
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const placeOrder = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (lines.length === 0) return;
    setLoading(true);
    setError('');
    try {
      await api.placeOrder();
      clear();
      navigate('/orders');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (lines.length === 0) {
    return (
      <section className="section checkout-page">
        <div className="checkout-box">
          <p className="eyebrow">{t('secureCheckout')}</p>
          <h1>{t('checkout')}</h1>
          <p style={{ color: 'var(--muted)' }}>{t('cartEmpty')}</p>
          <Link className="btn btn-dark" to="/products">{t('continueShopping')}</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section checkout-page">
      <div className="checkout-box">
        <p className="eyebrow">{t('secureCheckout')}</p>
        <h1>{t('checkout')}</h1>
        <p>{t('totalDue')}: <strong>{money(total)}</strong></p>
        {!user && (
          <p className="form-error">You must be logged in to place an order. <Link to="/login">Login</Link></p>
        )}
        {error && <p className="form-error">{error}</p>}
        <button
          className="btn btn-dark btn-full"
          onClick={placeOrder}
          disabled={loading || !user}
        >
          {loading ? '...' : t('placeOrder')}
        </button>
        <Link to="/cart">{t('cart')}</Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```
git add frontend/src/pages/CheckoutPage.tsx
git commit -m "feat(frontend): wire checkout to orders API, clear cart and redirect to /orders on success"
```

---

## Task 10: Frontend — Login Page Cleanup

**Files:**
- Modify: `frontend/src/pages/LoginPage.tsx`

- [ ] **Step 1: Remove hardcoded credentials**

Change the two `useState` initializers from hardcoded values to empty strings:

Replace:
```tsx
  const [email, setEmail] = useState('admin@menswear.local');
  const [password, setPassword] = useState('Admin123!');
```

With:
```tsx
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
```

- [ ] **Step 2: Commit**

```
git add frontend/src/pages/LoginPage.tsx
git commit -m "fix(frontend): remove hardcoded test credentials from LoginPage"
```

---

## Task 11: Frontend — Product Search

**Files:**
- Modify: `frontend/src/pages/ProductsPage.tsx`

- [ ] **Step 1: Replace ProductsPage.tsx**

```tsx
// frontend/src/pages/ProductsPage.tsx
import { Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProductCard } from '../components/ProductCard';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Category, Product } from '../types';

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const { t } = useI18n();

  useEffect(() => {
    api.categories(0).then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    api.products(0, false, search || undefined)
      .then(items => setProducts(categoryId ? items.filter(item => item.category?.id === Number(categoryId)) : items))
      .catch(() => setProducts([]));
  }, [categoryId, search]);

  return (
    <section className="section catalog-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t('menCollection')}</p>
          <h1>{t('products')}</h1>
        </div>
        <div className="catalog-filters">
          <label className="search-label">
            <Search size={16} />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('searchProducts')}
              className="search-input"
            />
          </label>
          <label className="filter">
            <SlidersHorizontal size={18} />
            <select value={categoryId} onChange={event => setCategoryId(event.target.value)}>
              <option value="">{t('allCategories')}</option>
              {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="product-grid">
        {products.map(product => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add search CSS** (append to `frontend/src/styles/global.css`)

```css
/* Product search */
.catalog-filters { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.search-label { display: flex; align-items: center; gap: .5rem; border: 1px solid var(--line); border-radius: 6px; padding: .4rem .75rem; background: #fff; }
.search-input { border: none; outline: none; font-size: .9rem; width: 180px; background: transparent; }
```

- [ ] **Step 3: Commit**

```
git add frontend/src/pages/ProductsPage.tsx frontend/src/styles/global.css
git commit -m "feat(frontend): add product search bar to ProductsPage"
```

---

## Task 12: Frontend — Admin Categories Edit/Delete

**Files:**
- Modify: `frontend/src/pages/AdminCategoriesPage.tsx`

- [ ] **Step 1: Replace AdminCategoriesPage.tsx**

```tsx
// frontend/src/pages/AdminCategoriesPage.tsx
import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Category } from '../types';

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const { t } = useI18n();

  const load = () => api.categories('').then(setCategories).catch(() => setCategories([]));
  useEffect(load, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (editing) {
      await api.saveCategory({ ...editing, name });
      setEditing(null);
    } else {
      await api.saveCategory({
        name,
        slug: name.toLowerCase().replaceAll(' ', '-'),
        genderTarget: 0,
        isEnabled: true,
        displayOrder: categories.length + 1,
      });
    }
    setName('');
    load();
  };

  const startEdit = (category: Category) => {
    setEditing(category);
    setName(category.name);
  };

  const cancelEdit = () => {
    setEditing(null);
    setName('');
  };

  const remove = async (id: number) => {
    if (!window.confirm(t('confirmDelete'))) return;
    await api.deleteCategory(id);
    load();
  };

  const toggleEnabled = async (category: Category) => {
    await api.saveCategory({ ...category, isEnabled: !category.isEnabled });
    load();
  };

  return (
    <div>
      <div className="admin-heading">
        <p className="eyebrow">{t('catalogGroups')}</p>
        <h1>{t('categories')}</h1>
      </div>
      <form className="inline-form" onSubmit={submit}>
        <input
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder={editing ? t('editCategory') : t('newCategoryPlaceholder')}
          required
        />
        <button className="btn btn-dark" type="submit">
          {editing ? t('saveProduct') : t('addCategory')}
        </button>
        {editing && (
          <button className="btn btn-outline" type="button" onClick={cancelEdit}>
            ✕
          </button>
        )}
      </form>
      <div className="admin-table">
        {categories.map(category => (
          <article className="admin-row" key={category.id}>
            <div><strong>{category.name}</strong><span>{category.slug}</span></div>
            <div className="admin-row-actions">
              <button
                className={category.isEnabled ? 'status active' : 'status'}
                onClick={() => toggleEnabled(category)}
                style={{ cursor: 'pointer', border: 'none', background: 'none', padding: 0 }}
              >
                {category.isEnabled ? t('enabled') : t('disabled')}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => startEdit(category)}>
                {t('editCategory')}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => remove(category.id)}>
                {t('deleteCategory')}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add admin-row-actions CSS** (append to `frontend/src/styles/global.css`)

```css
/* Admin row actions */
.admin-row { justify-content: space-between; }
.admin-row-actions { display: flex; align-items: center; gap: .75rem; }
.btn-sm { padding: .3rem .7rem; font-size: .8rem; }
.btn-ghost { background: none; border: none; color: var(--muted); cursor: pointer; }
.btn-ghost:hover { color: #dc2626; }
```

- [ ] **Step 3: Commit**

```
git add frontend/src/pages/AdminCategoriesPage.tsx frontend/src/styles/global.css
git commit -m "feat(frontend): add edit/delete/toggle to AdminCategoriesPage"
```

---

## Task 13: Frontend — Profile Page with Orders Link

**Files:**
- Modify: `frontend/src/pages/ProfilePage.tsx`

- [ ] **Step 1: Replace ProfilePage.tsx**

```tsx
// frontend/src/pages/ProfilePage.tsx
import { Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export function ProfilePage() {
  const { user, isAdmin, logout } = useAuth();
  const { t } = useI18n();

  return (
    <section className="section profile-page">
      <div className="profile-card">
        <p className="eyebrow">{t('customerProfile')}</p>
        <h1>{user?.firstName} {user?.lastName}</h1>
        <p>{user?.email}</p>
        <p>{t('roles')}: {user?.roles.join(', ')}</p>
        <div className="profile-actions">
          <Link className="btn btn-outline" to="/orders">
            <Package size={16} />
            {t('myOrders')}
          </Link>
          {isAdmin && (
            <Link className="btn btn-dark" to="/admin">{t('openAdminPanel')}</Link>
          )}
          <button className="btn btn-ghost" onClick={logout}>{t('logout')}</button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add profile-actions CSS** (append to `frontend/src/styles/global.css`)

```css
/* Profile */
.profile-actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.5rem; align-items: center; }
```

- [ ] **Step 3: Commit**

```
git add frontend/src/pages/ProfilePage.tsx frontend/src/styles/global.css
git commit -m "feat(frontend): add orders link and logout button to ProfilePage"
```

---

## Task 14: Frontend — Routing + Admin Nav

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/layouts/AdminLayout.tsx`

- [ ] **Step 1: Update App.tsx** — add /orders and /admin/orders routes

Replace the full content of `App.tsx`:

```tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { StoreLayout } from './layouts/StoreLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { OrderHistoryPage } from './pages/OrderHistoryPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminProductsPage } from './pages/AdminProductsPage';
import { AdminProductFormPage } from './pages/AdminProductFormPage';
import { AdminCategoriesPage } from './pages/AdminCategoriesPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { AdminOrdersPage } from './pages/AdminOrdersPage';

export function App() {
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductDetailsPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="orders" element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} />
      </Route>
      <Route path="admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="products/new" element={<AdminProductFormPage />} />
        <Route path="products/:id" element={<AdminProductFormPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 2: Update AdminLayout.tsx** — add Orders link

Replace the full content of `AdminLayout.tsx`:

```tsx
import { LayoutDashboard, Package, Settings, ShoppingBag, Tags } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';

export function AdminLayout() {
  const { t } = useI18n();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <NavLink className="logo" to="/">
          <img src="/Sofio_Logo.jpg" alt="Sofio Logo" style={{ height: '40px', objectFit: 'contain' }} />
          Sofio Style
        </NavLink>
        <nav>
          <NavLink to="/admin" end><LayoutDashboard size={18} />{t('dashboard')}</NavLink>
          <NavLink to="/admin/products"><Package size={18} />{t('products')}</NavLink>
          <NavLink to="/admin/categories"><Tags size={18} />{t('categories')}</NavLink>
          <NavLink to="/admin/orders"><ShoppingBag size={18} />{t('orders')}</NavLink>
          <NavLink to="/admin/settings"><Settings size={18} />{t('settings')}</NavLink>
        </nav>
      </aside>
      <section className="admin-content">
        <Outlet />
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```
git add frontend/src/App.tsx frontend/src/layouts/AdminLayout.tsx
git commit -m "feat(frontend): add /orders and /admin/orders routes, Orders link in admin nav"
```

---

## Verification

After all tasks complete, verify end-to-end:

**Backend:**
```
cd backend && dotnet run --project MenswearStore.Api
```
- Open `https://localhost:7060/swagger`
- Confirm `POST /api/orders`, `GET /api/orders`, `GET /api/orders/{id}`, `PUT /api/orders/{id}/status`, `GET /api/admin/orders` all appear
- `GET /api/products?search=shirt` returns filtered results
- `GET /api/admin/dashboard` response includes `orderCount`

**Frontend:**
```
cd frontend && npm run dev
```
- Login page opens with empty fields
- `/products` page has a search bar that filters live
- Add item to cart → `/checkout` → "Place Order" → redirects to `/orders` with the new order
- `/profile` has "My orders" link → leads to `/orders`
- `/admin/categories` shows Edit / Delete buttons; editing works; delete asks for confirmation
- `/admin/orders` lists all orders with a status dropdown; changing dropdown updates status immediately
- Admin dashboard stat card shows `orderCount`
