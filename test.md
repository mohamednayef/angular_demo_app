# Admin Panel — مهام الفرونت (SoldInn)

ده الـ spec اللي الفرونت محتاج ينفّذه في لوحة الأدمن. كله شغل على صفحات موجودة بالفعل، احنا بس بنزوّد عليها features جديدة متعلقة بإعدادات الدفع والرسوم.

## الأساسيات قبل ما نبدأ

- المشروع Angular (آخر إصدار)، الـ components الجديدة standalone أو جوه الـ Admin Module حسب اللي ماشيين عليه في المشروع.
- الـ API بتاعنا ASP.NET Core، والـ Base URL بييجي من `environment.ts`.
- كل الـ endpoints اللي تحت محمية بـ JWT والأدمن لازم يكون `Role = "Admin"`. يعني أي request لازم يطلع ومعاه الهيدر:
  ```
  Authorization: Bearer <token>
  ```
- كل الـ responses راجعة بنفس الشكل (wrapper موحّد)، فاعمل interface واحد واستخدمه في كل مكان:
  ```typescript
  interface ApiResponse<T> {
    success: boolean;
    result: T;
    message?: string;
  }
  ```
- على مستوى الـ UX في أي عملية: loading spinner وقت الـ call، toast نجاح أو فشل بعدها، و confirm dialog قبل أي حذف. الكلام ده مفروض في الفيتشرز التلاتة من غير ما أكرره تحت.

---

## 1) نسبة اللي بيدفعها الفائز — لكل بلد

الفكرة ببساطة إن الأدمن يقدر يحدد نسبة مئوية من قيمة الفوز يدفعها الفائز (مثلاً 10%). ده بيتظبط على مستوى البلد، ولو الأدمن ساب الخانة فاضية السيستم بياخد 10% افتراضياً.

الحقل الجديد ده جزء من بيانات البلد نفسها، فمش محتاجين endpoint جديد — بنستخدم نفس الـ Find والـ Update الموجودين.

**جلب البلد:**
```
GET /api/Country/Find/{countryCode}
```
الـ response بيرجع الأوبجيكت كامل وفيه `winningPaymentPercentage`:
```json
{
  "success": true,
  "result": {
    "countryCode": 66,
    "countryName": "Egypt",
    "currencyId": 1,
    "languageId": 1,
    "entranceFeesSession": 500.0,
    "entranceFeesEvent": 1000.0,
    "winningPaymentPercentage": 10.0
  }
}
```

**التحديث:**
```
PUT /api/Country/Update
```
بنبعت الأوبجيكت كامل (مش بس الحقل الجديد) بنفس الـ body اللي رجع من الـ Find بعد التعديل.

**المطلوب على الفورم:**

1. زوّد حقل جديد في فورم تعديل البلد الموجود:
   - Label: **نسبة ما يدفعه الفائز (%)**
   - Number input، placeholder: `10 (افتراضي)`
   - Validation: رقم بين 1 و 100، ويسمح بإنه يكون فاضي (null).
2. اربطه بـ `winningPaymentPercentage` في الـ model.
3. عند الحفظ ابعت الأوبجيكت كامل في الـ `PUT`. لو الخانة سايبها فاضية ابعت `null` عادي والباك هو اللي هيطبّق الـ 10%.

---

## 2) طرق الدفع المتاحة — لكل بلد

كل بلد ممكن يكون ليها أكتر من طريقة دفع، والأدمن هو اللي بيحدد المتاح. اللي بيتحدد هنا هو اللي العميل هيشوفه قدامه وقت ما يسجّل في المزاد.

الـ providers قيمها enum ثابتة:

| القيمة | الطريقة |
|--------|---------|
| `1` | OPay |
| `2` | PayPal |
| `3` | TRU (Paytabs) |

ولعرض الأسماء في الـ UI:
```typescript
const providerNames: Record<number, string> = {
  1: 'OPay',
  2: 'PayPal',
  3: 'TRU (Paytabs)'
};
```

**الـ endpoints:**

جلب الطرق المتاحة لبلد:
```
GET /api/CountryPaymentMethod/ByCountry/{countryCode}
```
```json
{
  "success": true,
  "result": [
    { "id": 1, "countryCode": 66, "provider": 1 },
    { "id": 2, "countryCode": 66, "provider": 3 }
  ]
}
```

إضافة طريقة:
```
POST /api/CountryPaymentMethod/Save
```
```json
{ "countryCode": 66, "provider": 1 }
```

حذف طريقة:
```
DELETE /api/CountryPaymentMethod/Delete/{id}
```

> **مهم:** فيه unique constraint على (البلد + الـ provider). لو بعت provider متضاف قبل كده لنفس البلد، الباك هيرجّع error. عشان كده استثنِ الطرق الموجودة من قايمة الإضافة من الأساس، عشان الأدمن ما يقدرش يبعت مكرر.

**المطلوب على الـ UI:**

1. في صفحة تفاصيل البلد (أو الـ modal اللي بيفتح لما يدوس على بلد) اعمل section جديد اسمه **"طرق الدفع المتاحة"**، وحمّله بالـ `ByCountry` أول ما البيانات تفتح.
2. اعرض الطرق الحالية على شكل chips / tags وكل واحدة جنبها زرار حذف (×):
   ```
   [ OPay × ]   [ TRU (Paytabs) × ]
   ```
   الضغط على (×) ينده الـ `Delete`، وبعد ما يرجع يحدّث القايمة.
3. للإضافة اعمل dropdown (أو checkbox group) فيه **بس** الطرق اللي لسه مش متضافة، وزرار "إضافة" يبعت `Save` ويحدّث القايمة بعدها.

---

## 3) رسوم الدخول — لكل عملة داخل المزاد

دي أكتر نقطة فيها تفصيل. الفكرة إن الأدمن يقدر يحط رسوم دخول مختلفة لكل عملة جوه مزاد معيّن — يعني المصري يدفع 500 جنيه، السعودي 50 ريال، الأمريكي 10 دولار — والكلام ده بيكون override فوق القيمة الافتراضية بتاعة البلد.

ترتيب الأولوية اللي الباك بيحسب بيه (مهم تفهمه عشان تظبط رسالة الـ tooltip صح):

```
رسوم العملة المحددة داخل المزاد   ← الأقوى
رسوم عامة للمزاد
رسوم البلد الافتراضية              ← الـ fallback
```

يعني لو مفيش override لعملة معيّنة، السيستم بينزل للأولوية اللي تحتها لحد ما يلاقي قيمة.

**الـ endpoints:**

جلب الـ overrides لمزاد:
```
GET /api/AuctionEntranceFeeOverride/ByAuction/{auctionSerial}
```
```json
{
  "success": true,
  "result": [
    {
      "id": 1,
      "auctionEventHSerial": 5,
      "currencyId": 1,
      "amount": 500.0,
      "currency": { "currencyId": 1, "symbol": "EGP" }
    },
    {
      "id": 2,
      "auctionEventHSerial": 5,
      "currencyId": 2,
      "amount": 15.0,
      "currency": { "currencyId": 2, "symbol": "USD" }
    }
  ]
}
```
لو مفيش overrides، `result` بترجع array فاضية `[]`.

إضافة أو تعديل (Upsert — نفس الـ endpoint للاتنين):
```
POST /api/AuctionEntranceFeeOverride/Upsert
```
```json
{ "auctionEventHSerial": 5, "currencyId": 2, "amount": 20.0 }
```
لو العملة دي ليها override موجود، الباك بيعدّله أوتوماتيك؛ لو جديدة بيضيف سطر. فمن ناحية الفرونت مفيش فرق بين الإضافة والتعديل، نفس الـ call.

حذف:
```
DELETE /api/AuctionEntranceFeeOverride/Delete/{id}
```

**المطلوب على الـ UI:**

1. في صفحة تفاصيل المزاد اعمل tab أو section جديد اسمه **"رسوم الدخول لكل عملة"**.
2. أول ما المزاد يفتح، نده `ByAuction` واعرض النتيجة في جدول بالأعمدة: **العملة | المبلغ | حذف**.

   | العملة | المبلغ | |
   |--------|--------|---|
   | EGP | 500.00 | حذف |
   | USD | 15.00 | حذف |

3. تحت الجدول (أو في modal) اعمل فورم إضافة/تعديل فيه:
   - Dropdown للعملة (من الـ API بتاع العملات الموجود عندنا أصلاً).
   - Input للمبلغ (رقم عشري).
   - زرار "حفظ" يبعت `Upsert`.

   لو اختار عملة موجودة بالفعل في الجدول → بيتعدّل سطرها. لو عملة جديدة → بيتضاف سطر. الاتنين نفس الـ call زي ما قلنا.
4. زرار الحذف في كل سطر بينده `Delete` ويحدّث الجدول. لو الأدمن مسح كل الـ overrides، السيستم بيرجع تلقائياً لرسوم البلد الافتراضية.
5. حُط tooltip أو note صغيرة توضّح السلوك ده:
   > لو مفيش override محدد للعملة دي، السيستم هيطبّق رسوم البلد الافتراضية.

---

## ملخص الـ Endpoints

| # | Method | Endpoint | الوظيفة |
|---|--------|----------|---------|
| 1 | `GET` | `/api/Country/Find/{countryCode}` | جلب بيانات بلد |
| 2 | `PUT` | `/api/Country/Update` | تحديث البلد + نسبة الفائز |
| 3 | `GET` | `/api/CountryPaymentMethod/ByCountry/{countryCode}` | طرق الدفع المتاحة لبلد |
| 4 | `POST` | `/api/CountryPaymentMethod/Save` | إضافة طريقة دفع |
| 5 | `DELETE` | `/api/CountryPaymentMethod/Delete/{id}` | حذف طريقة دفع |
| 6 | `GET` | `/api/AuctionEntranceFeeOverride/ByAuction/{auctionSerial}` | overrides المزاد |
| 7 | `POST` | `/api/AuctionEntranceFeeOverride/Upsert` | إضافة/تعديل override |
| 8 | `DELETE` | `/api/AuctionEntranceFeeOverride/Delete/{id}` | حذف override |

كلها Admin-only.

---

## الـ Models (TypeScript)

```typescript
interface Country {
  countryCode: number;
  countryName: string;
  phoneCode: string;
  countryphoneCode: string;
  currencyId: number;
  languageId: number;
  entranceFeesSession: number;
  entranceFeesEvent: number;
  winningPaymentPercentage: number | null; // الحقل الجديد
}

interface CountryPaymentMethod {
  id: number;
  countryCode: number;
  provider: 1 | 2 | 3; // 1=OPay, 2=PayPal, 3=TRU
}

interface AuctionEntranceFeeOverride {
  id: number;
  auctionEventHSerial: number;
  currencyId: number;
  amount: number;
  currency?: {
    currencyId: number;
    symbol: string;
  };
}

interface UpsertEntranceFeeOverrideRequest {
  auctionEventHSerial: number;
  currencyId: number;
  amount: number;
}

interface SaveCountryPaymentMethodRequest {
  countryCode: number;
  provider: number;
}
```
