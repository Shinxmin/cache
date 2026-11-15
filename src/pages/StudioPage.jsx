import BottomSearchBar from "../components/BottomSearchBar";
import PageHeader from "../components/PageHeader";
import { ImportIcon } from "../components/icons";

// 업로드할 수 있는 파일: 이미지·동영상·움짤만(폴더는 고를 수 없다).
export const STUDIO_ACCEPT =
  "image/*,video/*,.jpeg,.jpg,.png,.apng,.gif,.webp,.mp4,.avi,.mov,.m4v,.mkv,.webm";

// 스튜디오 화면(편집 기능은 나중에 붙인다). 하단바: <는 홈으로, 설정은 설정 화면(거기서 < 로 나오면 다시 스튜디오),
// + 는 켜져 있고 안에 업로드(이미지·동영상·움짤만 선택)와 불러오기(내 파일에서 골라 가져오기)가 있다.
// 검색은 이 화면에서 쓰지 않아 비활성이다(연필 아이콘, 플레이스홀더 없음). 세로폭은 이동 패널(리스트 3줄)과 같다.
export default function StudioPage({ files, onUpload, onImport, onOpenSettings, onBack, transfers, onOpenTransfers }) {
  return (
    <>
      <PageHeader title="스튜디오" transfers={transfers} onOpenTransfers={onOpenTransfers} />
      <div className="page page--has-dock page--studio-dock">
        {files.length > 0 && (
          <ul className="studio-files">
            {files.map((it) => (
              <li className="studio-file" key={it.id}>
                <span className="studio-file-name">{it.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <BottomSearchBar
        studioDock
        searchDisabled
        searchQuery=""
        onSearch={() => {}}
        canGoBack
        onBack={onBack}
        onOpenSettings={onOpenSettings}
        onUpload={onUpload}
        onNewFolder={onImport}
        plusAccept={STUDIO_ACCEPT}
        plusSecondLabel="불러오기"
        plusSecondIcon={<ImportIcon size={17} />}
      />
    </>
  );
}
