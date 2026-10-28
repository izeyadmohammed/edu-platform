export default async function policyView(el, params) {
  const type = params[0] || 'terms';
  const content = {
    terms: {
      title: 'شروط الاستخدام',
      body: '<p class="mb-4">مرحباً بك في منصتنا التعليمية. باستخدامك للمنصة، فإنك توافق على الشروط والأحكام التالية:</p><ul class="list-disc pr-6 space-y-2 text-gray-400"><li>يجب أن تكون جميع البيانات المقدمة صحيحة ودقيقة.</li><li>يمنع مشاركة الحساب أو المحتوى مع أي شخص آخر.</li><li>جميع المحاضرات والمواد محمية بحقوق الملكية الفكرية.</li><li>المنصة غير مسؤولة عن أي انقطاع في الإنترنت.</li></ul>'
    },
    privacy: {
      title: 'سياسة الخصوصية',
      body: '<p class="mb-4">نحن نقدر خصوصيتك. كيف نستخدم بياناتك:</p><ul class="list-disc pr-6 space-y-2 text-gray-400"><li>نستخدم رقم هاتفك لتسجيل الدخول وتقديم الخدمة.</li><li>لا نشارك بياناتك مع أي طرف ثالث لأغراض تسويقية.</li><li>يتم تأمين حسابك باستخدام تقنيات تشفير حديثة.</li></ul>'
    },
    refund: {
      title: 'سياسة الاسترجاع',
      body: '<p class="mb-4">يمكنك طلب استرجاع المبلغ في الحالات التالية:</p><ul class="list-disc pr-6 space-y-2 text-gray-400"><li>في حال عدم القدرة على الوصول للمحتوى بعد الشراء.</li><li>في حال وجود خطأ تقني يمنعك من مشاهدة المحاضرات.</li></ul>'
    }
  };

  const data = content[type] || content.terms;

  el.innerHTML = `
    <div class="glass-card max-w-3xl mx-auto p-8 animate-fade-up">
      <h1 class="text-3xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-purple-500">${data.title}</h1>
      <div class="leading-relaxed text-lg">${data.body}</div>
      <a href="#/home" class="inline-block mt-8 btn-primary">رجوع للرئيسية</a>
    </div>
  `;
}
