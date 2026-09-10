import { useSettings } from '@/hooks/useSettings';
import { buildWhatsAppLink } from '@/utils/whatsapp';

export function WhatsAppFloatButton() {
  const { settings } = useSettings();
  if (!settings.whatsappNumber) return null;

  return (
    <a
      href={buildWhatsAppLink(settings.whatsappNumber, `Hi! I'd like to know more about ${settings.businessName}.`)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-8 w-8" fill="currentColor">
        <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.362.687 4.564 1.872 6.416L4 29l7.775-1.826A11.94 11.94 0 0016 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3zm6.995 17.045c-.294.828-1.457 1.554-2.007 1.633-.532.078-1.204.11-1.94-.122-.447-.14-1.023-.328-1.766-.642-3.11-1.343-5.14-4.472-5.297-4.68-.156-.208-1.267-1.685-1.267-3.213 0-1.528.802-2.28 1.086-2.593.284-.312.62-.39.828-.39s.415.002.596.012c.19.01.446-.072.697.53.256.615.868 2.122.945 2.278.078.156.13.339.026.547-.104.208-.156.339-.31.52-.156.182-.328.406-.468.546-.156.156-.318.325-.137.637.182.312.807 1.334 1.734 2.16 1.19 1.06 2.194 1.39 2.506 1.546.312.156.494.13.676-.078.182-.208.777-.907.984-1.219.208-.312.416-.26.7-.156.286.104 1.81.855 2.121 1.01.312.156.52.234.598.364.078.13.078.751-.216 1.579z" />
      </svg>
    </a>
  );
}
