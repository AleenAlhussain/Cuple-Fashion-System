<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $translations = [
            'When will my online order arrive?' => [
                'title_ar' => 'متى سيصل طلبي الإلكتروني؟',
                'description_ar' => 'يستغرق التوصيل عادة من 3 إلى 5 أيام عمل داخل الإمارات. ستتلقى رقم تتبع بمجرد تجهيز طلبك.',
            ],
            'Where are your store locations?' => [
                'title_ar' => 'أين تقع فروعكم؟',
                'description_ar' => 'تقع متاجرنا في أهم المراكز التجارية في الإمارات ودول الخليج. يمكنك العثور على جميع الفروع عبر موقعنا في قسم محدد مواقع المتاجر.',
            ],
            'What are your prices?' => [
                'title_ar' => 'ما هي أسعاركم؟',
                'description_ar' => 'نقدم منتجات عالية الجودة بأسعار مناسبة جدًا، حيث تتوافق القيمة مع الجودة.',
            ],
            'When are offers available?' => [
                'title_ar' => 'متى تتوفر العروض؟',
                'description_ar' => 'نقدم عروضًا موسمية وترويجية على مدار العام. تابعونا على وسائل التواصل الاجتماعي للبقاء على اطلاع.',
            ],
            'Can I exchange online orders in-store?' => [
                'title_ar' => 'هل يمكنني استبدال الطلبات الإلكترونية داخل المتجر؟',
                'description_ar' => 'نعم، يمكن استبدال الطلبات الإلكترونية داخل المتجر خلال 14 يومًا مع إحضار الفاتورة الأصلية.',
            ],
            'How can I track my order?' => [
                'title_ar' => 'كيف يمكنني تتبع طلبي؟',
                'description_ar' => 'بمجرد شحن طلبك، ستصلك رسالة تحتوي على رقم التتبع عبر البريد الإلكتروني وواتساب.',
            ],
            'Do you offer cash on delivery?' => [
                'title_ar' => 'هل توفرون الدفع عند الاستلام؟',
                'description_ar' => 'نعم، نوفر خدمة الدفع عند الاستلام للطلبات داخل الإمارات.',
            ],
            'Can I cancel my order?' => [
                'title_ar' => 'هل يمكنني إلغاء طلبي؟',
                'description_ar' => 'يمكن إلغاء الطلبات قبل الشحن من خلال التواصل مع خدمة العملاء.',
            ],
            'Are your products original?' => [
                'title_ar' => 'هل منتجاتكم أصلية؟',
                'description_ar' => 'نعم، جميع منتجاتنا أصلية 100% ويتم توريدها مباشرة من موردين موثوقين.',
            ],
            'Do you offer international delivery?' => [
                'title_ar' => 'هل توفرون خدمة التوصيل الدولي؟',
                'description_ar' => 'نعم، نوفر خدمة التوصيل الدولي. قد تُطبق رسوم إضافية حسب وزن الشحنة ومسافة التوصيل.',
            ],
            'Can I return an online order to a physical store for a refund?' => [
                'title_ar' => 'هل يمكنني إرجاع طلب أونلاين إلى متجر فعلي لاسترداد المبلغ؟',
                'description_ar' => 'لا يمكن استرداد قيمة الطلبات الإلكترونية مباشرة داخل المتجر. لإتمام عملية الاسترداد، يرجى التواصل مع خدمة العملاء، وسيساعدونك في ترتيب عملية الإرجاع.',
            ],
        ];

        foreach ($translations as $title => $content) {
            $faq = DB::table('faqs')->where('title', $title)->first();

            if (! $faq) {
                continue;
            }

            $updates = [];

            if (empty($faq->title_ar)) {
                $updates['title_ar'] = $content['title_ar'];
            }

            if (empty($faq->description_ar)) {
                $updates['description_ar'] = $content['description_ar'];
            }

            if ($updates !== []) {
                $updates['updated_at'] = now();
                DB::table('faqs')->where('id', $faq->id)->update($updates);
            }
        }
    }

    public function down(): void
    {
        $titles = [
            'When will my online order arrive?',
            'Where are your store locations?',
            'What are your prices?',
            'When are offers available?',
            'Can I exchange online orders in-store?',
            'How can I track my order?',
            'Do you offer cash on delivery?',
            'Can I cancel my order?',
            'Are your products original?',
            'Do you offer international delivery?',
            'Can I return an online order to a physical store for a refund?',
        ];

        DB::table('faqs')
            ->whereIn('title', $titles)
            ->update([
                'title_ar' => null,
                'description_ar' => null,
                'updated_at' => now(),
            ]);
    }
};
