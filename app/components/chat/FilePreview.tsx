import React from 'react';

interface FilePreviewProps {
  files: File[];
  imageDataList: string[];
  onRemove: (index: number) => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ files, imageDataList, onRemove }) => {
  if (!files || files.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-row overflow-x-auto -mt-2">
      {files.map((file, index) => (
        <div key={file.name + file.size} className="mr-2 relative">
          {imageDataList[index] && (
            <div className="relative pt-4 pr-4">
              <img src={imageDataList[index]} alt={file.name} className="max-h-20 rounded-md" /> {/* Added rounded-md to image */}
              {/* Increased button size and icon size for better touch target and visibility */}
              <button
                onClick={() => onRemove(index)}
                aria-label={`Remove ${file.name}`}
                className="absolute top-[-4px] right-[-4px] z-10 bg-black/70 hover:bg-black/90 rounded-full w-8 h-8 shadow-md transition-colors flex items-center justify-center" // Increased size to w-8 h-8 (32px), adjusted position for better corner tap
              >
                <div className="i-ph:x w-4 h-4 text-white" /> {/* Icon size w-4 h-4 (16px) is fine for a 32px button */}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default FilePreview;
