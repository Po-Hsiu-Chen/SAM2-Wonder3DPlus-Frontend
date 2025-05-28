import React from 'react';

type UploadSectionProps = {
  previewUrl: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const UploadSection: React.FC<UploadSectionProps> = ({
  previewUrl,
  fileInputRef,
  handleFileChange,
}) => {
  if (previewUrl) return null;

  return (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#4285f4',
                cursor: 'pointer',
                padding: 20,
                borderRadius: 12,
                backgroundColor: '#FDFDFF',
                border: '1px dashed #4285f4',
              }}
            >
              <span className="material-symbols-outlined"  style={{ fontSize: 64, color: '#4285f4', marginBottom: 20}}>add_photo_alternate</span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('fileInput')?.click();
                }}

                style={{
                  display: 'inline-flex',
                  flexDirection: 'row',   
                  alignItems: 'center',   
                  background: 'linear-gradient(90deg, #5458FF 0%, #3CAAFF 100%)',
                  border: 'none',
                  borderRadius: 24,
                  gap: 6,
                  color: 'white',
                  padding: '10px 50px',
                  fontSize: 14,
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(0, 123, 255, 0.6)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  minWidth: 'fit-content'
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  style={{ width: 20, height: 20 }} 
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                  />
                </svg>
                上傳圖片
              </button>

              <p style={{ marginTop: 12, color: '#666' }}>點擊按鈕上傳圖片或將圖片拖入</p>
              <input
                id="fileInput"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
  );
};

export default UploadSection;
