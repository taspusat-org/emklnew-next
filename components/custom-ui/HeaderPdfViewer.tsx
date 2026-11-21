// File: CustomPdfLayoutPlugin.tsx (atau nama file lain yang sesuai, ekspor fungsi ini untuk digunakan di halaman PDF viewer)

import React, { useEffect, useRef, useState } from 'react';

import {
  defaultLayoutPlugin,
  ToolbarProps,
  ToolbarSlot
} from '@react-pdf-viewer/default-layout';

import {
  PrintPlugin,
  printPlugin,
  RenderPrintProps
} from '@react-pdf-viewer/print';

import {
  RenderZoomProps,
  ZoomPlugin,
  zoomPlugin
} from '@react-pdf-viewer/zoom';

import { SpecialZoomLevel } from '@react-pdf-viewer/core';

import {
  FaArrowDown,
  FaArrowUp,
  FaDownload,
  FaFileExport,
  FaMinus,
  FaPlus,
  FaPrint,
  FaBars,
  FaTimes,
  FaShare
} from 'react-icons/fa';

import { MdFullscreen } from 'react-icons/md';

// Fungsi untuk membuat instance custom layout plugin
// Parameter: onExport - callback dinamis untuk handle export (bisa disesuaikan per konteks/halaman)
export const HeaderPdfViewer = (
  onExport: () => void,
  onPrint: () => void,
  printInstance: PrintPlugin,
  zoomInstance: ZoomPlugin,
  pdfUrl?: string | null
) => {
  const handleSharePdf = async () => {
    if (!pdfUrl) {
      alert('PDF belum tersedia');
      return;
    }

    try {
      // Fetch PDF sebagai blob untuk di-share
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const file = new File([blob], `laporan_${Date.now()}.pdf`, {
        type: 'application/pdf'
      });

      // Cek apakah browser support Web Share API dengan file
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Share PDF Laporan',
            text: 'Laporan Container'
          });
          console.log('PDF berhasil dishare');
        } catch (err) {
          console.error('Share error:', err);
        }
      }
      // Fallback: copy URL ke clipboard
      else {
        await navigator.clipboard.writeText(pdfUrl);
        alert('Link PDF berhasil disalin ke clipboard:\n' + pdfUrl);
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      alert('Gagal membagikan PDF');
    }
  };
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onPrint();
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const beforePrint = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();

      if (window.matchMedia) {
        window
          .matchMedia('print')
          .removeEventListener('change', beforePrint as any);
      }

      //   setTimeout(() => {
      //     onPrint();
      //   }, 0);

      return false;
    };

    const afterPrint = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);

    window.addEventListener('keydown', handleKeyDown, true);

    window.addEventListener('beforeprint', beforePrint, true);
    window.addEventListener('afterprint', afterPrint, true);

    // if (window.matchMedia) {
    //   const printMediaQuery = window.matchMedia('print');
    //   printMediaQuery.addEventListener('change', (e) => {
    //     if (e.matches) {
    //       onPrint();
    //     }
    //   });
    // }

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('beforeprint', beforePrint, true);
      window.removeEventListener('afterprint', afterPrint, true);
    };
  }, []);

  const CustomZoomPopover = () => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [currentZoomOption, setCurrentZoomOption] = useState<string | number>(
      1
    );

    // Opsi zoom levels (persentase dan special levels seperti Firefox)
    const zoomOptions = [
      { label: '50%', value: 0.5 },
      { label: '75%', value: 0.75 },
      { label: '100%', value: 1 },
      { label: '125%', value: 1.25 },
      { label: '150%', value: 1.5 },
      { label: '200%', value: 2 },
      { label: '300%', value: 3 },
      { label: '400%', value: 4 },
      { label: 'Ukuran Asli', value: SpecialZoomLevel.ActualSize },
      { label: 'Muat Halaman', value: SpecialZoomLevel.PageFit },
      { label: 'Lebar Halaman', value: SpecialZoomLevel.PageWidth }
    ];

    // Effect untuk handle click outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          popoverRef.current &&
          !popoverRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      // Hanya tambahkan listener jika popover terbuka
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        // Optional: Tambahkan listener untuk ESC key
        const handleEscape = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
            setIsOpen(false);
          }
        };
        document.addEventListener('keydown', handleEscape);

        return () => {
          document.removeEventListener('mousedown', handleClickOutside);
          document.removeEventListener('keydown', handleEscape);
        };
      }
    }, [isOpen]);

    return (
      <zoomInstance.Zoom>
        {(props: RenderZoomProps) => {
          const { scale, onZoom } = props;

          // Fungsi helper untuk mendapatkan label saat ini
          const getCurrentLabel = () => {
            // Cek apakah ada option yang match dengan currentZoomOption
            const matchedOption = zoomOptions.find(
              (opt) => opt.value === currentZoomOption
            );
            if (matchedOption) {
              return matchedOption.label;
            }

            // Fallback ke scale percentage
            return `${Math.round(scale * 100)}%`;
          };

          // Fungsi untuk mengecek apakah option sedang terpilih
          const isOptionSelected = (optionValue: number | string) => {
            // Untuk special zoom levels, cek dengan currentZoomOption
            if (typeof optionValue === 'string') {
              return currentZoomOption === optionValue;
            }

            // Untuk numeric values, bandingkan dengan scale
            // dan pastikan tidak ada special zoom level yang aktif
            if (
              typeof optionValue === 'number' &&
              typeof currentZoomOption === 'number'
            ) {
              // Toleransi untuk floating point comparison
              return Math.abs(scale - optionValue) < 0.01;
            }

            return false;
          };

          // Handler untuk zoom change
          const handleZoomChange = (value: any) => {
            onZoom(value as any);
            setCurrentZoomOption(value);
            setIsOpen(false);
          };

          return (
            <div className="relative" ref={popoverRef}>
              <button
                className="flex h-6 min-w-[60px] items-center justify-between gap-0.5 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-700 hover:border-blue-500 focus:border-blue-500 focus:outline-none sm:h-7 sm:min-w-[80px] sm:gap-1 sm:px-2 sm:text-sm"
                onClick={() => setIsOpen(!isOpen)}
                type="button"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
              >
                <span className="truncate text-sm">{getCurrentLabel()}</span>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`text-gray-500 transition-transform sm:h-3 sm:w-3 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                >
                  <path
                    d="M6 9L12 15L18 9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Popover content dengan animasi */}
              {isOpen && (
                <>
                  {/* Optional: Backdrop transparan untuk mobile */}
                  <div
                    className="fixed inset-0 z-[9] sm:hidden"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                  />

                  <div
                    className="absolute top-full z-10 mt-1 max-h-60 w-32 overflow-y-auto rounded border border-gray-300 bg-white shadow-lg animate-in fade-in-0 zoom-in-95 sm:w-40"
                    role="listbox"
                  >
                    <ul className="py-1">
                      {zoomOptions.map((option, index) => {
                        const isSelected = isOptionSelected(option.value);

                        return (
                          <li
                            key={`${option.label}-${index}`}
                            className={`cursor-pointer px-2 py-1.5 text-xs transition-colors hover:bg-gray-100 sm:px-4 sm:py-2 sm:text-xs ${
                              isSelected
                                ? 'bg-blue-50 font-medium text-blue-700'
                                : 'text-gray-600'
                            }`}
                            onClick={() => handleZoomChange(option.value)}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{option.label}</span>
                              {isSelected && (
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  className="text-blue-600"
                                >
                                  <path
                                    d="M20 6L9 17L4 12"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </>
              )}
            </div>
          );
        }}
      </zoomInstance.Zoom>
    );
  };

  // Burger Menu Component for Mobile
  const MobileBurgerMenu = ({
    printInstance,
    onExport
  }: {
    printInstance: PrintPlugin;
    onExport: () => void;
  }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Try to find a usable PDF URL in the page (download anchor, iframe, embed, object)
    const findPdfUrl = () => {
      const anchor = document.querySelector(
        'a[download]'
      ) as HTMLAnchorElement | null;
      if (anchor && anchor.href) return anchor.href;

      const iframe = document.querySelector(
        'iframe'
      ) as HTMLIFrameElement | null;
      if (iframe && iframe.src) return iframe.src;

      const embed = document.querySelector(
        'embed[type="application/pdf"]'
      ) as HTMLEmbedElement | null;
      if (embed && embed.src) return embed.src;

      const obj = document.querySelector(
        'object[type="application/pdf"]'
      ) as HTMLObjectElement | null;
      if (obj && obj.data) return obj.data;

      return null;
    };

    return (
      <div className="relative sm:hidden">
        {/* Burger Menu Toggle Button - Only visible on mobile */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-gray-200"
          title="Menu"
        >
          {isMenuOpen ? (
            <FaTimes className="text-sm text-gray-600" />
          ) : (
            <FaBars className="text-sm text-gray-600" />
          )}
        </button>

        {/* Dropdown Menu - Only visible when open */}
        {isMenuOpen && (
          <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded border border-gray-300 bg-white shadow-lg">
            <div className="py-1">
              <button
                onClick={() => {
                  onExport();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-100"
              >
                <FaFileExport className="text-blue-600" />
                <span>Export</span>
              </button>

              <button
                onClick={() => {
                  const downloadButton = document.querySelector(
                    '[aria-label="Download"]'
                  ) as HTMLButtonElement;
                  if (downloadButton) downloadButton.click();
                  setIsMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-100"
              >
                <FaDownload className="text-green-600" />
                <span>Download</span>
              </button>
              <printInstance.Print>
                {(props: RenderPrintProps) => (
                  <button
                    onClick={() => {
                      onPrint();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <FaPrint className="text-cyan-500" />
                    <span>Print</span>
                  </button>
                )}
              </printInstance.Print>

              <button
                onClick={() => {
                  onExport();
                  setIsMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-100"
              >
                <FaFileExport className="text-orange-500" />
                <span>Export</span>
              </button>
              {pdfUrl ? (
                <button
                  onClick={() => {
                    handleSharePdf();
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-100"
                >
                  <FaShare className="text-purple-500" />
                  <span>Share</span>
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
  };

  return defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [defaultTabs[0]],
    renderToolbar: (Toolbar: React.ComponentType<ToolbarProps>) => (
      <Toolbar>
        {(slots: ToolbarSlot) => {
          const {
            GoToPreviousPage,
            GoToNextPage,
            ZoomOut: DefaultZoomOut,
            ZoomIn: DefaultZoomIn,
            CurrentPageInput,
            NumberOfPages,
            Download,
            EnterFullScreen
          } = slots;

          return (
            <div className="flex h-8 w-full items-center justify-between border-b border-gray-300 bg-gray-100 px-1 sm:h-9 sm:px-2 md:h-10">
              {/* Left section: Navigation - Always visible */}
              <div className="flex flex-1 items-center gap-0.5 sm:gap-1">
                {/* Previous/Next buttons */}
                <div className="flex items-center">
                  <GoToPreviousPage>
                    {(props) => (
                      <button
                        onClick={props.onClick}
                        disabled={props.isDisabled}
                        aria-label="Previous page"
                        className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 sm:h-7 sm:w-7"
                      >
                        <FaArrowUp className="text-xs text-gray-600 sm:text-sm" />
                      </button>
                    )}
                  </GoToPreviousPage>

                  <span className="px-0.5 text-xs text-gray-600 sm:text-sm">
                    |
                  </span>

                  <GoToNextPage>
                    {(props) => (
                      <button
                        onClick={props.onClick}
                        disabled={props.isDisabled}
                        aria-label="Next page"
                        className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 sm:h-7 sm:w-7"
                      >
                        <FaArrowDown className="text-xs text-gray-600 sm:text-sm" />
                      </button>
                    )}
                  </GoToNextPage>
                </div>

                {/* Page input */}
                <div className="flex items-center gap-0.5 px-1 sm:gap-1 sm:px-2">
                  <CurrentPageInput />
                  <span className="text-sm text-gray-600 sm:text-sm">/</span>
                  <NumberOfPages>
                    {(props) => (
                      <span className="text-sm text-gray-600 sm:text-sm">
                        {props.numberOfPages}
                      </span>
                    )}
                  </NumberOfPages>
                </div>
              </div>

              {/* Center section: Zoom controls - Always visible and centered */}
              <div className="flex flex-1 items-center justify-center gap-0.5 sm:gap-1">
                <DefaultZoomOut>
                  {(props) => (
                    <button
                      onClick={props.onClick}
                      aria-label="Zoom out"
                      className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-gray-200 sm:h-7 sm:w-7"
                    >
                      <FaMinus className="text-xs text-gray-600 sm:text-sm" />
                    </button>
                  )}
                </DefaultZoomOut>

                <span className="px-0.5 text-xs text-gray-600 sm:text-sm">
                  |
                </span>

                <DefaultZoomIn>
                  {(props) => (
                    <button
                      onClick={props.onClick}
                      aria-label="Zoom in"
                      className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-gray-200 sm:h-7 sm:w-7"
                    >
                      <FaPlus className="text-xs text-gray-600 sm:text-sm" />
                    </button>
                  )}
                </DefaultZoomIn>

                <CustomZoomPopover />
              </div>

              {/* Right section: Additional controls */}
              <div className="flex flex-1 items-center justify-end gap-0.5 sm:gap-1 md:gap-2">
                {/* Normal buttons for Tablet and Desktop - Hidden on mobile */}
                <div className="hidden items-center gap-1 sm:flex lg:gap-2">
                  <Download>
                    {(props) => (
                      <button
                        onClick={props.onClick}
                        aria-label="Download"
                        className="flex flex-row items-center gap-1 rounded bg-green-600 px-2 py-0.5 text-white transition-colors hover:bg-green-800 lg:gap-2 lg:px-3 lg:py-1"
                      >
                        <FaDownload className="text-xs lg:text-sm" />
                        <span className="hidden text-sm lg:inline">
                          Download
                        </span>
                      </button>
                    )}
                  </Download>

                  <printInstance.Print>
                    {(props: RenderPrintProps) => (
                      <button
                        onClick={onPrint}
                        className="flex flex-row items-center gap-1 rounded bg-cyan-500 px-2 py-0.5 text-white transition-colors hover:bg-cyan-700 lg:gap-2 lg:px-3 lg:py-1"
                      >
                        <FaPrint className="text-xs lg:text-sm" />
                        <span className="hidden text-sm lg:inline">Print</span>
                      </button>
                    )}
                  </printInstance.Print>

                  <button
                    onClick={onExport}
                    className="flex flex-row items-center gap-1 rounded bg-orange-500 px-2 py-0.5 text-white transition-colors hover:bg-orange-700 lg:gap-2 lg:px-3 lg:py-1"
                  >
                    <FaFileExport className="text-xs lg:text-sm" />
                    <span className="hidden text-sm lg:inline">Export</span>
                  </button>
                  {pdfUrl ? (
                    <button
                      onClick={handleSharePdf}
                      className="flex flex-row items-center gap-1 rounded bg-purple-500 px-2 py-0.5 text-white transition-colors hover:bg-purple-700 lg:gap-2 lg:px-3 lg:py-1"
                    >
                      <FaShare className="text-xs lg:text-sm" />
                      <span className="hidden text-sm lg:inline">Share</span>
                    </button>
                  ) : null}
                </div>

                {/* Mobile Burger Menu - Only visible on mobile */}
                <MobileBurgerMenu
                  printInstance={printInstance}
                  onExport={onExport}
                />

                {/* Hidden Download button for mobile burger menu to reference */}
                <div className="hidden">
                  <Download>
                    {(props) => (
                      <button onClick={props.onClick} aria-label="Download">
                        Download
                      </button>
                    )}
                  </Download>
                </div>

                {/* Fullscreen button - Always visible */}
                <EnterFullScreen>
                  {(props) => (
                    <button
                      onClick={props.onClick}
                      className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-gray-200 sm:h-7 sm:w-7"
                      title="Fullscreen"
                    >
                      <MdFullscreen className="text-lg text-gray-600 sm:text-2xl md:text-3xl" />
                    </button>
                  )}
                </EnterFullScreen>
              </div>
            </div>
          );
        }}
      </Toolbar>
    )
  });
};
