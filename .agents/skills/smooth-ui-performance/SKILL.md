---
name: smooth-ui-performance
description: >-
  Ultra-smooth 60-120 FPS UI performance optimization, buttery tab transitions (GSAP waterfall cascade), mobile responsive refinement, and automated browser verification. Activate whenever the user mentions UI lag, stutter, khựng, tab switching performance, mobile responsive optimization, or references jinil-landing-page / business portal patterns.
---

# Smooth UI Performance & Responsive Optimization Skill

Chuyên môn tối ưu hiệu năng giao diện Web App, đảm bảo tốc độ phản hồi 60–120 FPS, chuyển Tab mượt mà không khựng (dựa trên kiến trúc chuẩn của **`jinil-landing-page /business`**), chuẩn hóa Responsive Mobile và quy trình kiểm thử tự động bằng Headless Chrome / Puppeteer.

---

## 1. Kiến Trúc Chuyển Tab Mượt Mà (The Jinil B2B Waterfall Pattern)

Khi web app có nhiều Tab chứa biểu đồ Canvas, SVG, bảng tính dữ liệu lớn hoặc gọi API thời gian thực, **tuyệt đối không để trình duyệt vẽ lại DOM hoặc chụp ảnh toàn trang mỗi khi chuyển Tab**.

### A. Tích hợp GSAP Hardware-Accelerated Animation
Sử dụng thư viện `gsap.min.js` (nhẹ 72KB, chạy offline, đồng bộ `requestAnimationFrame` với tần số quét màn hình 60Hz/120Hz):

```javascript
function animateTabWaterfall(pane) {
    if (!pane || typeof gsap === 'undefined') return;

    // 1. Quét các thẻ/card quan trọng trong tab
    let targets = Array.from(
        pane.querySelectorAll('.waterfall-item, section, .card-item, .panel, .overview-header-bar, .exchange-tri-grid, .overview-stats-grid, [data-waterfall]')
    );

    // 2. Fallback sang các phần tử con trực tiếp nếu không có class đặc thù
    if (targets.length === 0) {
        const directChildren = Array.from(pane.children);
        const firstChild = directChildren[0];
        targets = (firstChild && firstChild.children && firstChild.children.length > 0)
            ? Array.from(firstChild.children)
            : directChildren;
    }

    // 3. Giới hạn tối đa 8 phần tử để giữ 60-120 FPS ổn định
    targets = targets.filter(el => {
        if (!el) return false;
        return window.getComputedStyle(el).display !== 'none';
    }).slice(0, 8);

    if (targets.length === 0) return;

    // 4. HỦY NGAY các animation đang chạy dở (chống khựng khi user click tab liên tục)
    gsap.killTweensOf(targets);

    // 5. Hiệu ứng thác nước GPU fromTo siêu êm ái
    gsap.fromTo(
        targets,
        {
            y: 16,
            autoAlpha: 0,
        },
        {
            y: 0,
            autoAlpha: 1,
            duration: 0.28,
            stagger: 0.03, // Thác nước so le cực nhanh 30ms
            ease: 'power2.out',
            force3D: true, // Ép layer GPU riêng biệt
            clearProps: 'transform,opacity,visibility', // Dọn sạch inline style khi xong
        }
    );
}
```

### B. Cơ chế Tab Render Cache (Lazy-Mounting)
- **Chỉ render DOM nặng 1 lần duy nhất**: Khi người dùng vào Tab lần đầu tiên (`_renderedTabs.has(tabId) === false`).
- **Tái sử dụng tức thì (0ms)**: Khi quay lại Tab đã xem, chỉ cần đổi class `.active`, không chạy lại hàm render Canvas/Table/SVG.
- **Hủy cache khi dữ liệu thay đổi**: Tạo hàm `invalidateTabCache(tabId)` để gọi khi thêm/sửa/xóa giao dịch hoặc đổi đơn vị tiền tệ.
- **Throttle API mạng**: Giới hạn tần suất gọi API live (Crypto/Stock/Tỷ giá) ngầm tối thiểu 60–90 giây/lần, không chặn (non-blocking) luồng chính.

### C. CSS Tối Giản Cho Tab Pane
Tránh dùng CSS keyframes delay so le phức tạp gây xung đột với GSAP:
```css
.tab-pane {
    display: none;
}
.tab-pane.active {
    display: block;
}
```

---

## 2. Tiêu Chuẩn Responsive Mobile Không Lỗi Bố Cục

### A. Chuẩn hóa nút icon góc trên (`header-tools-right`)
Tránh lỗi `flex-shrink: 1` làm các nút icon (như ổ khóa, theme, avatar) bị co ép thành hình viên thuốc dẹt:
```css
.privacy-toggle-btn,
.theme-toggle,
.user-badge {
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    min-height: 36px !important;
    max-width: 36px !important;
    max-height: 36px !important;
    flex: 0 0 36px !important;
    flex-shrink: 0 !important;
    border-radius: 10px !important;
    padding: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-sizing: border-box !important;
}
```

### B. Tránh thanh điều hướng đáy che khuất nội dung
Thanh điều hướng nổi (`.mobile-bottom-nav`) có chiều cao ~62px + lề đáy ~12px:
- Luôn đặt khoảng đệm đáy cho khung nội dung chính:
  ```css
  .main-content.header-layout {
      padding: 12px 14px calc(96px + env(safe-area-inset-bottom, 16px)) !important;
  }
  .tab-pane {
      padding-bottom: 24px !important;
  }
  ```
- **Nhãn Menu ngắn gọn**: Giới hạn tối đa 1–2 từ (ví dụ: *Tổng quan, Tài sản, Ngân sách, Tỷ giá, Cài đặt*) để không bị tràn thành dấu ba chấm (`...`) trên màn hình 360px–390px.

### C. Vuốt ngang cảm ứng (Horizontal Touch Swiping)
Mọi thanh chọn chế độ (Segmented control) và thanh bộ lọc (Filter pills) phải hỗ trợ lướt ngang mượt mà:
```css
.segmented-selector,
.asset-filters-bar,
.exchange-legend-selector {
    display: flex !important;
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
    scrollbar-width: none !important;
    white-space: nowrap !important;
}
.segmented-selector::-webkit-scrollbar {
    display: none !important;
}
.segmented-btn {
    flex: 0 0 auto !important;
    white-space: nowrap !important;
}
```

---

## 3. Tiêu Chuẩn Nút Chế Độ Biểu Đồ (Segmented Pill Buttons)
Bộ nút chọn chế độ (như Lưới 3 biểu đồ, từng cặp tiền, % so sánh) phải luôn có bọc khung rõ ràng:
- **Khung chứa (`.exchange-legend-selector`)**: `background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 4px; display: inline-flex; gap: 6px;`.
- **Nút thường (`.exchange-mode-btn`)**: `background: transparent; border: 1px solid transparent; border-radius: 9px; padding: 7px 14px; font-weight: 600; color: var(--text-secondary);`.
- **Nút kích hoạt (`.exchange-mode-btn.active`)**: `background: var(--bg-card); color: var(--text-primary); border-color: var(--border); box-shadow: 0 2px 8px rgba(0,0,0,0.1);`.
- Có chấm màu chỉ báo trực quan tương ứng với màu nét vẽ biểu đồ.

---

## 4. Quy Trình Kiểm Thử Tự Động (Browser Audit với Puppeteer)

Mỗi khi thực hiện tối ưu, hãy chạy kịch bản tự động kiểm tra bằng Node.js + `puppeteer-core` kết nối Chrome:
1. **Kiểm tra kích thước thật**: Lấy `getBoundingClientRect()` của nút ổ khóa, theme, avatar để đảm bảo tỷ lệ 1:1 (36px × 36px) và `flex-shrink === "0"`.
2. **Kiểm tra tràn ngang (Horizontal Overflow)**: Đảm bảo `scrollWidth <= clientWidth` trên viewport di động (390 × 844 px).
3. **Đo thời gian chuyển Tab**: Thời gian phản hồi từ khi click đến khi hiển thị phải đạt **dưới 50ms**.
4. **Kiểm tra lỗi Console**: Đảm bảo **0 lỗi (Zero errors/warnings)**.

---

## Khi Nào Kích Hoạt Bộ Skill Này?
- Khi người dùng gửi prompt: *"Tối ưu responsive"*, *"Giao diện bị lag, chưa mượt"*, *"Chuyển tab bị khựng"*, *"CSS lại nút cho vừa vặn"*, hoặc *"Tham khảo repo jinil-landing-page"*.
- Agent sẽ tự động áp dụng ngay bộ tiêu chuẩn GSAP Waterfall, Render Cache, CSS Flexbox cố định và kiểm thử bằng Chrome Headless.

