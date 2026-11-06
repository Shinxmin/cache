import BottomSearchBar from "../components/BottomSearchBar";
import PageHeader from "../components/PageHeader";
import { ImportIcon } from "../components/icons";

// 업로드할 수 있는 파일: 이미지·동영상·움짤만(폴더는 고를 수 없다).
export const STUDIO_ACCEPT =
  "image/*,video/*,.jpeg,.jpg,.png,.apng,.gif,.webp,.mp4,.avi,.mov,.m4v,.mkv,.webm";

// 스튜디오 화면. 하단바: 세로폭은 이동 화면 리스트 3줄일 때와 같고(안쪽 요소는 추후 추가), 검색바는 연필 아이콘·플레이스홀더 없이 기본 비활성(입력이 필요한 기능을 쓸 때만 켠다), 설정은 비활성, 뒤로(<)는 홈으로, + 는 켜져 있고 안에 업로드(기존 로직,
// 이미지·동영상·움짤만 선택)와 불러오기(내 파일에서 골라 가져오기)가 있다.
export default function StudioPage({ files, onUpload, onImport, onBack, transfers, onAckTransfer }) {
  return (
    <>
      <PageHeader title="스튜디오" transfers={transfers} onAckTransfer={onAckTransfer} />
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
        settingsDisabled
        searchQuery=""
        onSearch={() => {}}
        canGoBack
        onBack={onBack}
        onUpload={onUpload}
        onNewFolder={onImport}
        plusAccept={STUDIO_ACCEPT}
        plusSecondLabel="불러오기"
        plusSecondIcon={<ImportIcon size={17} />}
      />
    </>
  );
}
