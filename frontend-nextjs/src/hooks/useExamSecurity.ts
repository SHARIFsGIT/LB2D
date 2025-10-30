import { useCallback, useEffect } from 'react';

interface ExamSecurityConfig {
  preventRightClick?: boolean;
  preventCopy?: boolean;
  preventPrint?: boolean;
  preventDevTools?: boolean;
  preventTabSwitch?: boolean;
  preventScreenshot?: boolean;
  onViolation?: (type: string) => void;
}

/**
 * @param isActive
 * @param config
 */
export const useExamSecurity = (
  isActive: boolean,
  config: ExamSecurityConfig = {}
) => {
  const {
    preventRightClick = true,
    preventCopy = true,
    preventPrint = true,
    preventDevTools = true,
    preventTabSwitch = true,
    preventScreenshot = true,
    onViolation = () => {},
  } = config;

  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (preventRightClick && isActive) {
      e.preventDefault();
      onViolation('right-click');
      return false;
    }
  }, [isActive, preventRightClick, onViolation]);

  const handleCopy = useCallback((e: ClipboardEvent) => {
    if (preventCopy && isActive) {
      e.preventDefault();
      onViolation('copy');
      return false;
    }
  }, [isActive, preventCopy, onViolation]);

  const handlePrint = useCallback((e: Event) => {
    if (preventPrint && isActive) {
      e.preventDefault();
      onViolation('print');
      return false;
    }
  }, [isActive, preventPrint, onViolation]);

  const detectDevTools = useCallback(() => {
    if (preventDevTools && isActive) {
      const threshold = 160;
      const devtools = {
        open: false,
        orientation: null as string | null,
      };

      if (
        window.outerHeight - window.innerHeight > threshold ||
        window.outerWidth - window.innerWidth > threshold
      ) {
        devtools.open = true;
        devtools.orientation =
          window.outerHeight - window.innerHeight > threshold ? 'vertical' : 'horizontal';
        onViolation('devtools');
      }
    }
  }, [isActive, preventDevTools, onViolation]);

  const handleVisibilityChange = useCallback(() => {
    if (preventTabSwitch && isActive) {
      if (document.hidden) {
        onViolation('tab-switch');
      }
    }
  }, [isActive, preventTabSwitch, onViolation]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isActive) return;

    if (preventDevTools && e.key === 'F12') {
      e.preventDefault();
      onViolation('f12');
      return false;
    }

    if (preventDevTools && e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      onViolation('devtools-shortcut');
      return false;
    }

    if (preventDevTools && e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      onViolation('console-shortcut');
      return false;
    }

    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      onViolation('view-source');
      return false;
    }

    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      onViolation('save');
      return false;
    }

    if (preventPrint && e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      onViolation('print-shortcut');
      return false;
    }

    if (preventScreenshot && e.key === 'PrintScreen') {
      e.preventDefault();
      onViolation('screenshot');
      navigator.clipboard.writeText('');
      return false;
    }
  }, [isActive, preventDevTools, preventPrint, preventScreenshot, onViolation]);

  const handleSelectStart = useCallback((e: Event) => {
    if (preventCopy && isActive) {
      e.preventDefault();
      return false;
    }
  }, [isActive, preventCopy]);

  useEffect(() => {
    if (!isActive) return;

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCopy);
    document.addEventListener('paste', handleCopy);
    window.addEventListener('beforeprint', handlePrint);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const devToolsInterval = preventDevTools
      ? setInterval(detectDevTools, 500)
      : null;

    const style = document.createElement('style');
    style.id = 'exam-security-styles';
    style.innerHTML = `
      body.exam-mode {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
      body.exam-mode img {
        -webkit-user-drag: none !important;
        -khtml-user-drag: none !important;
        -moz-user-drag: none !important;
        -o-user-drag: none !important;
        user-drag: none !important;
      }
    `;
    document.head.appendChild(style);
    document.body.classList.add('exam-mode');

    // Cleanup function
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCopy);
      document.removeEventListener('paste', handleCopy);
      window.removeEventListener('beforeprint', handlePrint);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (devToolsInterval) {
        clearInterval(devToolsInterval);
      }

      const styleElement = document.getElementById('exam-security-styles');
      if (styleElement) {
        styleElement.remove();
      }
      document.body.classList.remove('exam-mode');
    };
  }, [
    isActive,
    handleContextMenu,
    handleCopy,
    handlePrint,
    handleKeyDown,
    handleSelectStart,
    handleVisibilityChange,
    detectDevTools,
    preventDevTools,
  ]);

  const isSafeExamBrowser = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('seb') || userAgent.includes('safeexambrowser');
  }, []);

  const requestFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
    }
  }, []);

  return {
    isSafeExamBrowser: isSafeExamBrowser(),
    requestFullscreen,
    exitFullscreen,
  };
};
