# CYBERPULSE 3D - PROJECT HANDOVER & CONTEXT CONTINUITY

Tài liệu này lưu trữ toàn bộ trạng thái kiến trúc, tiến độ kỹ thuật, các quyết định thiết kế và quy tắc bắt buộc của USER từ cuộc hội thoại trước để bất kỳ Agent / Chat mới nào cũng có thể kế thừa 100% ngữ cảnh mà không bị lệch hướng.

---

## 1. TỔNG QUAN HỆ THỐNG & CÔNG NGHỆ
- **Framework:** Vite + React 18 + TypeScript + Three.js (`@react-three/fiber`, `@react-three/drei`).
- **State Management:** Zustand (`src/store/usePlayerStore.ts`).
- **Physics & Shaders:** Pure GLSL Shaders (Fresnel, 3D Simplex Noise, Screen-space derivatives `dFdx/dFdy`, Polar Shockwave Ring Shader), Web Audio API FFT Analyzer.
- **Visualizer cốt lõi:** Chuyên biệt 100% cho **Hệ Mặt Trời Keplerian 3D (Heliocentric Orrery)**, Nhật hoa mặt trời plasma, Sóng xung kích CME dạng đĩa phẳng 2D, Cực quang (Aurora) trên Trái Đất/Sao Mộc, Thiên thạch liên sao bay thẳng (Interstellar Bolide), và Thanh trắc địa lượng tử vô hạn (Geodesic Horizon). (Đã chính thức loại bỏ chế độ LIGO theo yêu cầu của USER để tối ưu hóa sự tập trung và tối giản giao diện).
- **Phong cách thị giác:** Avant-garde / Swiss Brutalist (Monochrome & Spectral), viền khung kỹ thuật chính xác, UI không rác.

---

## 2. CÁC QUY TẮC & YÊU CẦU NGHIÊM NGẶT CỦA USER (BẮT BUỘC TUÂN THỦ)

1. **Sóng xung kích CME (Mặt Trời phóng ra):**
   - Phải là **hình tròn/đĩa phẳng 2D** (`cmeGroupRef.scale.set(r, 1, r)` trên mặt phẳng quỹ đạo XZ), **tuyệt đối KHÔNG ĐƯỢC làm hình cầu 3D** và không bị méo elip.
   - Khi sóng CME chạm tới quỹ đạo Trái Đất và Sao Mộc, cực quang (Aurora) xuất hiện một thời gian rồi tự tắt.
2. **Thời điểm phóng sóng CME:**
   - **Tuyệt đối KHÔNG phóng theo chu kỳ (không dùng interval/timer fallback)!**
   - Chỉ phóng khi bản nhạc đạt đến **đoạn cao trào (Climax / Drop)** được phát hiện tự động bởi thuật toán `isClimax` trong `AudioEngine.ts`.
   - Có thời gian hồi bảo vệ (lockout/cooldown) **7.0 giây** (đã hạ từ 24s theo yêu cầu user) để tránh spam, đồng thời cho phép bắt kịp các đợt cao trào dồn dập nối tiếp nhau.
3. **Giao diện HUD:**
   - **BỎ NÚT BẤM THỦ CÔNG:** Không thêm các nút như `[ ⚡ CLIMAX CME ]` vào HUD. Giữ UI gọn gàng, đậm chất kỹ thuật Swiss Brutalist.
4. **Nhịp đập mở màn (Cold-Start Kick):**
   - Khi vừa bấm Play nhạc hoặc đổi bài: Mặt Trời và visualizer **đập đúng 1 nhịp mở màn duy nhất** cho đã tai/mắt, **tuyệt đối không đập liên thanh 3–4 lần**.
5. **Độ nảy của Mặt Trời xuyên suốt bài hát (Đã sửa lỗi ngày 26/10/2026):**
   - Công thức nảy của Mặt Trời: `SunScale = 1.0 + (Bass * 0.28) + (BeatIntensity * 0.45)`.
   - Đã sửa lỗi: Giữa đến cuối bài nhạc có nền bass dày (`bassEnergyHistory > 0.55`), thuật toán cũ dùng `minMargin = bassEnergyHistory * 0.15` khiến mất 95.5% nhịp kick. Đã hạ xuống `minMargin = Math.max(0.016, bassEnergyHistory * 0.055)` và kiểm tra sườn dốc `isRising > 0.016`. Mặt Trời giờ nảy đều đặn 100% đến hết bài.
6. **Định danh duy nhất (Single Identity):**
   - Đã loại bỏ hoàn toàn LIGO khỏi ứng dụng. Toàn bộ mã nguồn, shader, store và HUD tập trung 100% vào Hệ Mặt Trời (Heliocentric Orrery).
7. **Quy trình làm việc:**
   - Làm xong phải luôn: Đánh giá ưu điểm, nhược điểm, đề xuất phương án và sửa nhược điểm. Lặp lại cho tới khi hoàn hảo.

---

## 3. BẢN ĐỒ CÁC FILE QUAN TRỌNG

| File | Vai trò | Trạng thái hiện tại |
| :--- | :--- | :--- |
| `src/audio/AudioEngine.ts` | Web Audio API singleton, adaptive beat flux, climax/drop detector, 128BPM demo synth. | Đã fix: Bắt nhịp 100% xuyên suốt bài, 1 kick mở màn, climax lockout 24s. |
| `src/components/canvas/concepts/SolarSystemCore.tsx` | Hệ mặt trời Kepler, nhật hoa, CME 2D planar shockwave, Aurora logic. | Đã fix: CME 2D đĩa phẳng tròn, kích hoạt qua `isClimax`, xóa timer chu kỳ. |
| `src/components/hud/SolarSystemHud.tsx` | HUD điều khiển telemetry hệ mặt trời, Spectral/Monochrome toggle. | Đã xóa nút CME thủ công theo yêu cầu user. |
| `src/store/usePlayerStore.ts` | Quản lý state nhạc, play/pause, seek, audio tracking reset. | Đã gắn `resetAudioTracking()` cho Play/Seek/Track select. |
| `src/shaders/cmeShockwaveShader.ts` | GLSL Shader cho sóng xung kích CME 2D. | Polar coordinate UVs, bow shock + ripples + inner fade. |
| `src/components/canvas/concepts/InterstellarBolide.tsx` | Thiên thạch liên sao bay thẳng tuyến tính (Newton 1st Law). | Chuyển động thẳng đều, tốc độ chậm êm ái (~4.0 units/s, lướt 6s), đuôi ion dài 2.2 AU rõ nét, 1px vector thanh mảnh, 0 GC per frame. |
| `src/components/canvas/concepts/RelativisticGeodesicHorizon.tsx` | Trục laser trắc địa không-thời gian Geodesic Einstein vô hạn. | Kéo dài vô hạn $X \in [-80, +80]$, phân bố lưới phi tuyến 512 đỉnh, tách đôi vàng kim/xanh ngọc quanh Sol, hợp nhất ở không gian sâu. |
| `src/components/canvas/concepts/KeplerHarmonograph.tsx` | Đồ thị âm nhạc thiên cầu Kepler (Harmonices Mundi Earth-Venus 8:13). | Dây cung cộng hưởng 42 đỉnh, che khuất cận nhật (Solar Limb Occlusion) bảo vệ Mặt Trời tinh khiết, 0 GC. |
| `src/components/canvas/concepts/KuiperRadarBoundary.tsx` | Đai bụi băng Kuiper thiên thể tự nhiên. | 380 hạt KBO băng giá trôi dạt Keplerian lấp lánh theo Treble, đã loại bỏ toàn bộ vòng radar và thước kẻ 40/50 AU để giữ không gian sạch đẹp. |
| `src/components/canvas/concepts/MilkyWayBackdrop.tsx` | Hậu cảnh dải Ngân Hà sâu thẳm (Milky Way Galactic Plane & Great Rift). | Nghiêng 60.2 độ chuẩn thiên văn học, nhân Sagittarius A*, rãnh bụi tối Great Rift, nướng texture 2048x1024 ở startup, khóa cứng 120 FPS, 0 GC. |
| `.agent/skills/astrophysical-space-lighting/SKILL.md` | Skill hệ thống chiếu sáng không gian chuyên sâu (ACES Filmic Tone Mapping, Perceptual Irradiance, Forward Mie Scattering). | Chuẩn hóa vật lý thiên văn & chiaroscuro tối giản Denis Villeneuve, 0 GC, khóa cứng 120 FPS. |
| `.agent/skills/rigorous-concept-crucible/SKILL.md` | Skill quy chuẩn nghiên cứu, thẩm định & đối chứng ý tưởng (Anti-Speculation Crucible). | Quy trình chạy nghiên cứu tối thiểu 30p, cấm suy đoán phỏng đoán, 5 cửa ải phản biện đối chứng. |
| `src/components/canvas/VisualizerCanvas.tsx` | Canvas WebGL Three.js chính | Đã kích hoạt `ACESFilmicToneMapping` và `toneMappingExposure: 1.15`, kiểm soát tương phản HDR tuyệt đối. |

---

## 4. LỆNH CHẠY & KIỂM TRA MÔI TRƯỜNG
- Dev server: `npm run dev` (chạy tại `http://localhost:3000/`)
- Type check: `npx tsc --noEmit`
- Production build: `npm run build`

---

## 5. TÍNH NĂNG MỚI: TƯƠNG THÍCH HOÀN HẢO VỚI K-HIPHOP / MELODIC RAP / BALLAD (CẬP NHẬT 26/10/2026)
- **Bản nhạc mẫu của USER:** `Sick Enough To Die (Part 2) - MC Mong Ft. Sweden Laundry` (đã copy từ `Downloads` vào `public/music/` và preload sẵn làm bài mặc định trong player).
- **Vấn đề cốt lõi của thể loại K-HipHop/Ballad trước đây:**
  1. File nhạc có âm lượng master lớn (-9.5dB) làm dải Sub-Bass Bin 1 (93Hz) bị chạm trần 255 (saturation clipping) nếu dùng dải Decibel mặc định (-100dB đến -30dB), khiến kick không còn biên độ dâng `isRising` $\to$ mất nhịp.
  2. Bins 6, 7, 8 (dải 500-750Hz: vocal và snare) bị bỏ sót trong code cũ.
  3. Đoạn điệp khúc cao trào trong Melodic Rap bùng nổ ở dải vocal/strings/drums với tỷ lệ surge $14-18\%$ (chứ không phải $28\%$ như EDM drop), khiến sóng CME không bao giờ nổ trong suốt 4 phút.
- **Giải pháp kỹ thuật đã áp dụng và kiểm chứng:**
  1. `analyser.minDecibels = -85; analyser.maxDecibels = -10; analyser.smoothingTimeConstant = 0.75;` mở rộng khoảng đệm (headroom), loại bỏ hoàn toàn bão hòa ở 255.
  2. Mở rộng Sub-bass sang Bins 1–6 với tỷ lệ cân bằng `55% peak + 45% avg`.
  3. Dải Mid kết nối lại từ Bins 7–64, bắt trọn giai điệu acoustic guitar, piano và giọng hát Sweden Laundry / MC Mong.
  4. Ngưỡng bùng nổ cao trào `surgeRatio > 1.14` kết hợp năng lượng tổng hòa quyện 50% Bass + 50% Acoustic:
     - Kích hoạt chuẩn xác **3 lần cao trào** trong bài: `0:24` (Hết intro vào rap beat), `0:53` (Điệp khúc 1), `2:50` (Đại điệp khúc Outro cuối bài).
     - Không có báo động giả trong suốt các phân đoạn êm dịu.
     - Phát hiện **623 nhịp kick** đều đặn suốt 4 phút 6 giây (trước đây chỉ bắt được 33 nhịp).
  5. Preload sẵn bài hát trong `usePlayerStore.ts`, mở web là có thể bấm Play thưởng thức ngay lập tức!

---

## 6. Ý TƯỞNG 1 VÀ 3 ĐÃ TRIỂN KHAI HOÀN TẤT (26/10/2026)
1. **Ý tưởng 1: Nhịp thở giai điệu nhật hoa (Solar Corona Melodic Breathing):**
   - File cập nhật: [`solarCoronaRaysShader.ts`](file:///d:/_Study/cyberpulse-3d/src/shaders/solarCoronaRaysShader.ts), [`SolarCoronaBillboard.tsx`](file:///d:/_Study/cyberpulse-3d/src/components/canvas/concepts/SolarCoronaBillboard.tsx), [`sunAtmosphereShader.ts`](file:///d:/_Study/cyberpulse-3d/src/shaders/sunAtmosphereShader.ts).
   - Cơ chế: Khi có kick (`beatIntensity > 0.1`), ưu tiên cú nảy trống dứt khoát. Khi trống nghỉ (intro ballad, solo piano, vocal mộc), hào quang nhật hoa phập phồng ấm áp theo nốt đàn và giọng hát (`uMid` và `uAcousticEnergy`).
   - Lưu ý: Đã xóa bỏ hoàn toàn các vòm bão từ đỏ (`SolarProminenceLoops.tsx`) theo yêu cầu của user để giữ Mặt Trời tròn trịa, tinh khiết, không bị đốm đỏ thừa thãi.
2. **Ý tưởng 3: Trục Laser Trắc Địa Không-Thời Gian Vô Hạn (Infinite Relativistic Geodesic Beam):**
   - File thành phần: [`RelativisticGeodesicHorizon.tsx`](file:///d:/_Study/cyberpulse-3d/src/components/canvas/concepts/RelativisticGeodesicHorizon.tsx).
   - Cơ chế: Trục laser trắc địa 3D trải dài vô hạn $X \in [-80.0, +80.0]$, xuyên thủng toàn bộ khung nhìn ra ngoài không gian sâu.
   - Phân bố lưới phi tuyến 512 đỉnh (stretched grid): Mật độ tập trung cao nhất quanh giếng thế Sol ($|x| < 3.2$), tự động tách đôi thành 2 nhánh Vàng Kim và Lam Ngọc ôm lấy quang quyển Mặt Trời, rồi chập lại thành 1 sợi laser bạch kim duy nhất kéo dài vô tận ra hai đầu vũ trụ.
   - Sóng âm time-domain lan tỏa mượt mà dọc theo thân laser, ổn định dần khi vươn ra vô cực.
3. **Ý tưởng 4: Nhật Thực Toàn Phần & Nhẫn Kim Cương (Đã thử nghiệm & Gỡ bỏ theo yêu cầu của user):**
   - Đã xóa bỏ hoàn toàn `PlanetaryEclipseDiamondRing.tsx`, `diamondRingShader.ts` và khôi phục quỹ đạo góc quay camera tự nhiên.
4. **Dọn dẹp mã nguồn thừa (26/10/2026):**
   - Đã xóa bỏ hoàn toàn tệp `HorizonWaveform.tsx` (đoạn thẳng ngang thừa từng gắn nhầm vào layer `rings`).
   - Nút layer `RINGS` trên HUD giờ đây điều khiển trực tiếp việc ẩn/hiện đường chân trời sóng âm Einstein Geodesic trong Hệ Mặt Trời và Reticle Rings trong LIGO.
   - Đã dỡ bỏ `HalleyComet.tsx` và `PlanetaryMagnetosphere.tsx` theo yêu cầu của user để giữ không gian sạch đẹp tối giản.
   - Đã gỡ bỏ hoàn toàn `ParkerSolarSpiral.tsx` và `RelativisticPrecessionClock.tsx` theo yêu cầu của user để trả lại không gian tối giản, tinh khiết tuyệt đối cho khu vực quanh Mặt Trời (loại bỏ hoàn toàn rác thị giác và chồng chéo hình vẽ).
   - Đã gỡ bỏ hoàn toàn `HeliopauseBoundary.tsx`, vòng chuẩn độ 30/40/50 AU, sóng radar DSN và tia laser rangefinder theo yêu cầu của user: Ở ngoài rìa chỉ giữ lại vẻ đẹp tự nhiên của các hạt bụi băng Kuiper lấp lánh và quỹ đạo Sao Hải Vương / Diêm Vương, loại bỏ hoàn toàn các vòng tròn nhân tạo gây rối mắt.
   - Đã gỡ bỏ hoàn toàn 2 đám bụi tiểu hành tinh Trojan Sao Mộc (`JupiterTrojanSwarms.tsx`) cùng 2 thùy thế năng Jacobi theo yêu cầu của user để giải phóng quỹ đạo Sao Mộc, giúp toàn cảnh hệ hành tinh hoàn toàn sạch sẽ, thoáng đãng.
   - Đã gỡ bỏ hoàn toàn vệt xé ngân hà / cosmic sword slash (`CosmicSwordSlash.tsx`) theo yêu cầu của user, khôi phục lại trọn vẹn dải ngân hà tự nhiên và bầu trời tinh khiết.

---

## 7. HỆ THỐNG CHIẾU SÁNG KHÔNG GIAN ASTROPHYSICAL SPACE LIGHTING (CẬP NHẬT 26/10/2026)
- **Skill chuyên trách:** `.agent/skills/astrophysical-space-lighting/SKILL.md`
- **Kiến trúc cốt lõi:**
  1. **ACES Filmic HDR Tone Mapping:** Áp dụng đường cong Academy Color Encoding System trên WebGL Canvas (`toneMappingExposure: 1.15`). Vùng sáng chói lọi của quang quyển Mặt Trời, hạt granulation và tia nhật hoa có độ cuộn vai mượt mà, triệt tiêu hiện tượng vỡ hạt/bệt trắng phẳng.
  2. **Perceptual Heliocentric Irradiance Scaling:** Áp dụng công thức suy giảm quang thông theo khoảng cách nhật tâm: Sao Thủy/Sao Kim chói lọi sắc nét, Trái Đất danh nghĩa 1.0x, Sao Mộc/Sao Thổ lạnh lẽo, Sao Diêm Vương/Hải Vương mang sắc starlight u tối viễn cảnh.
  3. **Forward Mie Scattering (Viền trăng lưỡi liềm ngược sáng):** Tán xạ Cornette-Shanks tạo ra viền hào quang trăng lưỡi liềm sắc lạnh, cực mỏng ôm lấy nửa tối của các hành tinh có khí quyển (Kim, Trái Đất, Hỏa, Mộc, Thổ, Thiên Vương, Hải Vương) khi nhìn ngược sáng về phía Mặt Trời. Các thiên thể không có khí quyển (Thủy, Mặt Trăng, Ceres, Pluto) giữ nguyên đường viền bóng đen sắc lạnh chân không.
  4. **Analytical Solar & Lunar Eclipses + Planetshine:** Bóng nhật thực quét qua bề mặt Trái Đất (Mặt Trăng) và Sao Mộc (Io/Europa) tính bằng hình học tia thuần túy (0 shadow map); nửa tối của Mặt Trăng nhận ánh sáng bạc Trái Đất (Earthshine), vệ tinh Galilean nhận Jovianshine; nhật thực toàn phần khi vệ tinh lọt vào nón bóng tối hành tinh mẹ.
  5. **Dynamic Camera Exposure & Eye Adaptation:** Điều tiết đồng tử camera thích ứng mượt mà giữa $1.02$ (nhìn vào Sol) và $1.28$ (nhìn ra viễn vũ trụ Pluto/Kuiper) với 0 GC allocation.
  6. **Audio-Reactive Heliocentric Waves:** Sóng bức xạ nhật tâm lan tỏa từ Sol ra ngoài mặt phẳng hoàng đạo tạo ánh nhấp nháy quang học mỏng nhẹ theo nhịp trống kick/bass.
  7. **Scotopic Starlight Ambient:** Toàn bộ ánh sáng khuếch tán không gian được tinh chỉnh từ xám phẳng sang sắc ánh sao bạc viễn vũ trụ scotopic (`#C8D6E5` / `vec3(0.048, 0.054, 0.068)`), giúp nửa tối của hành tinh hòa quyện hữu cơ với dải Ngân Hà nền mà vẫn giữ tuyệt đối độ sâu void `#050507`.
  8. **Hiệu năng:** Khóa cứng **117–120 FPS**, cấp phát **0 byte GC per frame** (toàn bộ tính toán chạy trong GPU fragment shaders và module static vectors).

---

## 8. TÍNH NĂNG ĐỒNG BỘ CAO TRÀO ĐIỆN ẢNH (CINEMATIC DOLLY MICRO-DRIFT - 26/10/2026)
- **Tệp cài đặt:** `src/components/canvas/VisualizerCanvas.tsx` (bên trong `CameraRig`).
- **Cơ chế vật lý:**
  1. Khi xuất hiện đoạn cao trào / drop (`isClimax`), camera nhận xung lực co giãn vi mô (recoil impulse).
  2. Camera giật lùi nhẹ nhàng ra sau $+2.4\text{ units}$ ($\sim 18\%$ góc nhìn rộng hơn), đồng thời nâng độ cao góc nhìn lên $+1.15\text{ units}$ (tương đương nâng góc nhìn $+2.5^\circ$ góc tà).
  3. Mở khẩu độ trường nhìn FOV từ $46.0^\circ \to 48.2^\circ$ (hiệu ứng Hitchockian Dolly-Zoom vi mô) tạo cảm giác không-thời gian giãn nở hùng vĩ khi sóng xung kích CME quét qua các quỹ đạo.
  4. Sau đó trong vòng $4.8\text{ giây}$ (khớp với chu kỳ sóng CME lan ra ngoài), camera từ từ trôi bồng bềnh êm ái hồi phục về quỹ đạo chuẩn ban đầu.
  5. Cấp phát **0 byte GC** per frame, hoàn toàn độc lập với các thao tác tay của người dùng.

---

## 9. QUY CHUẨN LẬP Ý TƯỞNG & PHẢN BIỆN ĐỐI CHỨNG (CẬP NHẬT 26/10/2026)
- **Skill chuyên trách:** `.agent/skills/rigorous-concept-crucible/SKILL.md`
- **Mệnh lệnh cốt lõi (Anti-Speculation Mandate):**
  - **TUYỆT ĐỐI CẤM suy đoán cảm tính hoặc đưa ra ý tưởng phỏng đoán hời hợt.**
  - Mọi ý tưởng mới bắt buộc phải trải qua quy trình nghiên cứu chuyên sâu tối thiểu 30 phút, đối chứng tiền lệ vật lý thiên văn thực nghiệm (NASA/ESA/SpaceEngine) và nghệ thuật tối giản (Ryoji Ikeda/Nonotak/Denis Villeneuve).
  - Vượt qua 5 cửa ải phản biện đối chứng (Adversarial Red-Teaming & 5-Gate Clearance) trước khi được phép đề xuất lên USER:
    1. Tiền lệ khoa học & nghệ thuật thực chứng (0% phỏng đoán).
    2. Bảo toàn tuyệt đối khoảng đen `#050507` và tính tôn nghiêm của Mặt Trời Sol.
    3. Phản biện và triệt tiêu 5 nguy cơ phá hoại (lòe loẹt, méo phối cảnh, chồng chéo, rối mắt, nhàm chán).
    4. Cam kết toán học khóa cứng **120 FPS** và **0 GC**.
    5. Cấu trúc trình bày trung thực, khiêm tốn, chỉ ra cả ưu lẫn nhược điểm.



---

## 10. TÁN XẠ THẤU QUANG VÀNH ĐAI SAO THỔ CASSINI & QUỸ ĐẠO LƯỚT ĐIỆN ẢNH (26/10/2026)
- **Tệp cài đặt:**
  - `src/shaders/saturnRingShader.ts`: Bổ sung toán học tán xạ thấu quang thuận (Cassini Forward Scattering Phase Function) và hàm truyền quang học xuyên vành băng.
  - `src/components/canvas/VisualizerCanvas.tsx`: Bổ sung quỹ đạo lướt điện ảnh Cassini 36 giây vòng quanh Sao Thổ trong `CameraRig`, đồng thời hỗ trợ xoay tự do không bị khóa khi ở chế độ `orbit`.
- **Cơ chế vật lý thiên văn thực nghiệm (Cassini ISS PIA08329):**
  1. **Phase Cosine & Đỉnh Tán xạ Băng:** Tinh thể nước đá micron trong vành đai có hệ số bất đối xứng cao ($g = 0.82$). Khi góc nhìn ngược sáng ($\alpha \in [135^\circ, 180^\circ]$), hàm pha Henyey-Greenstein tạo đỉnh tán xạ thuận cực đại:
     $$P_{\text{ice}}(\cos\theta) = \frac{1 - g^2}{(1 + g^2 - 2g \cos\theta)^{1.5}} \times 0.09$$
  2. **Đảo nghịch độ dày quang học (Optical Depth Inversion):**
     - Vành B đặc khít ($\tau \approx 0.92 \dots 1.65$) hấp thụ và chặn gần như toàn bộ photon ngược sáng ($e^{-2.1 \tau}$), trở thành dải tối tương phản như hình chụp Cassini "In Saturn's Shadow".
     - Vành A ($\tau \approx 0.58$) và Vành C ($\tau \approx 0.22$) cho phép chùm photon xuyên thấu và tán xạ trực diện vào mắt người quan sát, bừng sáng ánh bạc kim cương băng giá chói lọi.
     - Khe Cassini và khe Encke giữ nguyên độ trong suốt chân không tuyệt đối (loại bỏ hoàn toàn qua `discard;`).
  3. **Bóng tối địa cầu (Globe Umbra Shadow):** Nón bóng đen hình trụ của quả cầu Sao Thổ cắt đứt chùm tán xạ thuận, tạo bóng trăng khuyết sắc lẹm cắt ngang hệ vành đai.
  4. **Cassini Camera Sweep:** Trong chế độ cinematic, camera từ từ lướt quanh Sao Thổ trong chu kỳ 36s: chiêm ngưỡng toàn bộ các góc chiếu từ mặt thuận nắng sáng rực đến góc ngược sáng thấu quang kỳ vĩ, rồi quay trở lại.
  5. **Hiệu năng & Tối giản:** Không thêm bất kỳ mesh/line/polygon nào. Toàn bộ tính toán diễn ra trong GPU fragment shader, đạt khóa cứng **120 FPS** và **0 GC** allocations.

---

## 11. HỆ THỐNG ĐIỆN ẢNH TỔNG QUAN HỆ MẶT TRỜI & VÀNH XUNG KÍCH THOÁNG QUA RÌA NGOÀI (MACRO SYSTEM CINEMATICS & OUTER BOUNDARY PULSE RING - 26/10/2026)
- **Skill chuyên trách:** `.agent/skills/macro-system-cinematics/SKILL.md`
- **Mục tiêu cốt lõi:** Nâng cấp trải nghiệm góc nhìn toàn cảnh (Macro/Overview System) theo đúng mong muốn của USER:
  1. Vành sợi chỉ bao quanh hệ mặt trời xuất phát từ rìa ngoài nở ra nhẹ theo nhịp đập của nhạc rồi biến mất.
  2. Vệt vận tốc chuyển động dọc theo các quỹ đạo elip Keplerian thực thụ.
  3. Xóa bỏ hoàn toàn đường neon xanh lá cây/vàng chanh arcade để đạt độ tinh khiết ánh sao kim cương (Diamond-Starlight Beam).
  4. Đạo diễn camera giao hưởng 3 chương (96s) xóa tan sự nhàm chán của góc quay đơn điệu cũ.
- **Tệp cài đặt & Cơ chế hoạt động:**
  1. **Vành Xung Kích Thoáng Qua Rìa Ngoài (`src/components/canvas/concepts/OuterHeliosphericPulseRing.tsx`):**
     - Hình dáng: Sợi chỉ elip 1px vector viền ngoài ($R = 13.5\text{ AU}$, độ lệch tâm $e = 0.028$, độ nghiêng $i = 1.4^\circ$, $\Omega = 131.78^\circ$) đặt ở chu vi vành ngoài hệ mặt trời (ngay phía ngoài quỹ đạo Hải Vương/Thiên Vương).
     - Trạng thái bình thường: Hoàn toàn vô hình (`opacity = 0`), bảo vệ 100% độ sâu thẳm `#050507`.
     - Kích hoạt nhịp: Khi có nhịp trống (`beatIntensity > 0.1` và `isRising`), vòng sợi chỉ khẽ nở nhẹ $+8\% \to +12\%$ theo mặt phẳng hoàng đạo nghiêng và tan biến nhanh chóng trong $0.65\text{s}$ bằng hàm suy giảm bậc ba phi tuyến ($1 - t^3$).
     - Quản lý bộ nhớ: Ring buffer pool 3 vòng với con trỏ xoay vòng (`ringPoolRef`), bắt trọn cả những đoạn nhịp kick dồn dập (triplet/16th-note kicks) mà cấp phát **0 GC per frame**.
     - Tích hợp trực tiếp vào `src/components/canvas/concepts/SolarSystemCore.tsx`.
  2. **Vệt Vận Tốc Quỹ Đạo Keplerian Động (`src/shaders/keplerOrbitShader.ts`):**
     - Thay thế toàn bộ `LineBasicMaterial` tĩnh khô cứng trên 8 hành tinh chính + 2 hành tinh lùn (Ceres, Pluto).
     - Tích hợp Định luật 2 Kepler: Đuôi sáng vận tốc quét ngược theo hướng chuyển động của hành tinh với độ dài tỉ lệ nghịch với bán trục lớn: $L_{\text{wake}} \propto a^{-0.42}$. Sao Thủy lướt nhanh để lại vệt sáng dài sống động, các hành tinh xa xôi trôi chậm tĩnh lặng.
     - Suy giảm quang thông nhật tâm ($I_{\text{helio}} \propto (\sqrt{r/2.2}+0.85)^{-1}$) giữ cho các quỹ đạo ngoài mờ ảo scotopic hữu cơ.
     - Tương tác âm thanh: Dải bass và nhịp kick làm rực sáng nhẹ dọc theo thân quỹ đạo.
  3. **Chùm Trắc Địa Kim Cương Ánh Sao Thuần Khiết (`src/components/canvas/concepts/RelativisticGeodesicHorizon.tsx`):**
     - Triệt tiêu hoàn toàn hiện tượng pha trộn sinh màu xanh lá cây chanh (chartreuse green) trong `AdditiveBlending` giữa `#ffcc44` và `#00f3ff`.
     - Thay thế bằng cặp màu cao cấp: Bạc starlight thuần khiết (`#E2E8F0`) và Lam ngọc băng hà (`#B8D4F0`).
     - Khi hòa quyện ở không gian sâu, tạo nên một chùm tia laser trắc địa kim cương lạnh buốt, thanh khiết, sang trọng chuẩn bảo tàng nghệ thuật tối giản Thụy Sĩ.
  4. **Đạo Diễn Camera Giao Hưởng 3 Chương (`src/components/canvas/VisualizerCanvas.tsx`):**
     - Chu kỳ 96 giây chia đều thành 3 chương với quá trình chuyển cảnh êm ái bằng Hermite smoothstep trong 6 giây cuối:
       - **Chương 1 (0s–32s) - Golden Vista:** Cao độ vừa phải ($Y = 5.2, R = 13.2$), ngắm nhìn trọn vẹn toàn cảnh hệ hành tinh, độ nghiêng quỹ đạo và nhật hoa Sol.
       - **Chương 2 (32s–64s) - Ecliptic Horizon Glider:** Cao độ thấp ($Y = 1.35, R = 14.5$), lướt ngang mặt phẳng hoàng đạo như tàu không gian viễn thám, chiêm ngưỡng các quỹ đạo xếp tầng đan xen.
       - **Chương 3 (64s–96s) - Keplerian Polar God's-Eye View:** Cao độ cực đỉnh ($Y = 15.2, R = 8.6$), nhìn vuông góc từ cực bắc xuống toàn bộ mạng lưới quỹ đạo Keplerian tuyệt mỹ.
     - Thay thế nhiễu camera ngẫu nhiên `Math.random()` bằng dao động điều hòa tự nhiên `Math.sin(time * 12.0) * beatIntensity * 0.025`.
  5. **Hiệu năng & Độ ổn định:** Khóa cứng **118–120 FPS**, cấp phát **0 byte GC per frame**, vượt qua kiểm thử build production (`npm run build`) và chụp ảnh kiểm chứng tự động Puppeteer 100%.

---

## 12. HỆ THỐNG CAMERA VISTA GÓC VÀNG TĨNH & TÀU VŨ TRỤ DU HÀNH CHẬM RÃI ĐIỆN ẢNH (26/10/2026)
- **Skill chuyên trách:** `.agent/skills/cinematic-spacecraft-camera/SKILL.md`
- **Yêu cầu cốt lõi từ USER:**
  - `1 là để cam 1 góc đó`: Giữ góc tĩnh tuyệt đối đúng như bức ảnh người dùng đã chụp và chọn (`X = 3.24, Y = 5.12, Z = 12.78`), nhìn thẳng vào Mặt Trời `(0, 0, 0)`, không tự xoay vòng vòng gây chóng mặt hay mất góc đẹp.
  - `2 là 1 góc cam giống như đang ngồi trên 1 con tàu vũ trụ để tham quan toàn bộ á, yêu cầu là di chuyển chậm và điện ảnh nhất có thể, lập skill để làm`: Góc nhìn từ buồng quan sát của con tàu viễn thám du hành chậm rãi, lướt êm qua không gian sâu với quỹ đạo 3D epicyclic uyển chuyển.
- **Triển khai kỹ thuật:**
  1. **Hỗ trợ 3 Chế độ Camera mượt mà (`src/store/usePlayerStore.ts`):**
     - `cameraMode: 'vista' | 'spacecraft' | 'orbit'`.
     - Mặc định: `'vista'` (mở web là cố định ngay góc vàng người dùng yêu thích nhất).
  2. **Nút bấm chuyển đổi trực quan trên HUD (`src/components/hud/TopTelemetry.tsx`):**
     - Nút 3 trạng thái với icon và màu nhận diện cao cấp:
       - `[ 👁️ VISTA ]` (Hổ phách): Góc tĩnh kinh điển ngắm toàn cảnh ổn định, tĩnh lặng.
       - `[ 🚀 SPACECRAFT ]` (Cyan): Buồng lái tàu vũ trụ du hành chậm rãi, điện ảnh qua toàn cảnh.
       - `[ 📷 ORBIT ]` (Monochrome): Xoay chuột tự do.
     - Bấm 1 click là chuyển đổi tức thì, nhấp nháy đèn tín hiệu trực quan.
  3. **Động lực học Chế độ Vista Quay Đều ("cái vista phải cho nó quay" - `src/components/canvas/VisualizerCanvas.tsx`):**
     - Giữ nguyên vẹn cao độ vàng $Y = 5.12$, bán kính $R = 13.2$, điểm nhìn $\mathbf{T} = (0, 0, 0)$ từ bức ảnh người dùng đã chọn.
     - Khởi đầu đúng góc $0.248\text{ rad}$ và **quay đều đặn 360° quanh Sol** với vận tốc góc tĩnh tại $\omega = 0.035\text{ rad/s}$ ($\approx 180\text{ giây}$ một vòng). Camera luôn chuyển động mượt mà mà vẫn duy trì góc ngắm hoàn mỹ.
  4. **Tàu Vũ Trụ Bay Theo Quỹ Đạo Sao Diêm Vương ("quỹ đạo như sao diêm vương" - `src/components/canvas/VisualizerCanvas.tsx`):**
     - Ý tưởng đột phá của USER: Dùng chính cơ học thiên thể Keplerian của **Sao Diêm Vương (Pluto)** để làm quỹ đạo cho tàu vũ trụ viễn thám:
       - $a = 14.6\text{ AU}$, độ lệch tâm cực lớn $e = 0.2488$, độ nghiêng chéo $i = 17.16^\circ$, $\Omega = 110.3^\circ$, $\omega = 113.7^\circ$.
       - Chu kỳ 110 giây ($\approx 1.8$ phút) lướt trọn vẹn qua 4 góc nhìn thần thánh:
         1. *Đỉnh Cực Bắc ($Y \approx +4.8\text{ AU}$):* Nhìn chúc xuống toàn bộ chiếc đĩa hệ mặt trời nghiêng $17^\circ$.
         2. *Bổ nhào qua mặt phẳng hoàng đạo ($Y \to 0$):* Các đĩa quỹ đạo và vành đai xếp chồng ngang tầm mắt.
         3. *Bầu trời Nam viễn xứ ($Y \approx -5.2\text{ AU}$):* Nhìn ngược từ dưới lên toàn bộ hệ mặt trời được Sol chiếu sáng trên nền dải Ngân Hà sâu thẳm.
         4. *Tăng tốc cận nhật ($r \to 11.0\text{ AU}$):* Tuân thủ Định luật 2 Kepler, con tàu tự động tăng tốc lao vút qua khu vực cận nhật rồi từ từ giảm tốc khi vươn ra viễn nhật ngoài đai Kuiper ($r \to 18.2\text{ AU}$).
     - Cơ chế Lệch Tâm Điện Ảnh Quán Tính (Kinematic Inertial Gaze Drag): Trung tâm nhìn vẫn neo vào Mặt Trời, nhưng khi phi thuyền tăng tốc/lượn cua tại Cận nhật ($r \to 11\text{ AU}$), quán tính kéo điểm nhìn lệch nhẹ $\approx 7^\circ$ sang 1/3 khung hình theo bố cục quy tắc một phần ba điện ảnh. Khi tàu bay chậm ở Viễn nhật ($r \to 18\text{ AU}$), Mặt Trời tự động trôi êm ả về giữa tâm màn hình.
     - Triệt tiêu 100% rung giật: Hoàn toàn loại bỏ rung lắc màn hình do nhịp trống (`beatIntensity`) và các xung lực giật nảy/phóng FOV khi Mặt Trời phóng sóng CME (`driftElevation`, `driftFov`). Tầm nhìn qua vòm kính tàu vũ trụ êm ru tuyệt đối 100%.
     - Nghiêng cánh quán tính `rotateZ(bankAngle)`, mở rộng FOV $52.0^\circ$. Khóa cứng 120 FPS, 0 byte GC.
  5. **Hiệu năng & Kiểm thử:** Khóa cứng **118–120 FPS**, cấp phát **0 byte GC per frame**, vượt qua `npm run build` và kiểm thử snapshot tự động Puppeteer 100%.

---

## 13. DEMO 2 HƯỚNG TIẾP CẬN ĐIỆN ẢNH CHO TÀU VŨ TRỤ (HULL CAM & BUBBLE HUD)

- **Skill đặc thù:** 
  - [`.agent/skills/cinematic-spacecraft-canopy/SKILL.md`](file:///d:/_Study/cyberpulse-3d/.agent/skills/cinematic-spacecraft-canopy/SKILL.md)
  - [`.agent/skills/cinematic-spacecraft-camera/SKILL.md`](file:///d:/_Study/cyberpulse-3d/.agent/skills/cinematic-spacecraft-camera/SKILL.md)
- **Đáp ứng chỉ thị của USER:**
  - *"thử demo 2 hướng xem"*
- **Triển khai kỹ thuật (`SpacecraftCockpit3D.tsx`, `SpacecraftObservationDeck.tsx`, `TopTelemetry.tsx`):**
  1. **Nút bấm chuyển đổi linh hoạt 4 trạng thái (Top Telemetry):**
     `VISTA -> HULL CAM (Hướng 1) -> BUBBLE HUD (Hướng 2) -> ORBIT -> VISTA`
  2. **Hướng 1: Exterior Hull Cam (`spacecraftStyle: 'hull'`):**
     - Loại bỏ toàn bộ khung bao quanh 4 cạnh.
     - Dựng cánh delta tàng hình cơ khí (Stealth Delta Wing) ở góc dưới-trái: vỏ carbon titan đen mờ, lưỡi titan vát sắc bén đón ánh starlight, cụm vòi phun phản lực RCS, đèn beacon wingtip thở nhẹ 2.5s.
     - Cánh nghiêng cùng camera khi tàu lượn góc trên quỹ đạo Pluto, vũ trụ sâu thẳm lướt ở hậu cảnh với thị sai 3D chân thực (>90% tầm nhìn mở toang).
  3. **Hướng 2: Bubble Canopy / Fighter Jet Optical HUD (`spacecraftStyle: 'bubble'`):**
     - $100\%$ không gian mở toang, không có vật cản 3D trước ống kính.
     - Tâm ngắm quang học vi mô (Optical Graticule), chỉ dấu vector bay prograde `—○—`.
     - Thang đo góc nghiêng chân trời (Pitch Ladder `+05° / 00° / -05°`) xoay nghiêng theo góc lượn con tàu theo thời gian thực.
     - Cặp thông số sườn kỹ thuật tối giản Swiss Brutalist: `ORBIT / JPL DE440`, `17.16° INCL`, `14.6 AU`, `15.8 KM/S`.
  4. **Hiệu năng & Kiểm thử:** Khóa cứng **118–120 FPS**, cấp phát **0 byte GC per frame**, build production pass sạch 100%.


---

## 14. Academic Astrometric Visor (Kính Thiên Văn Học Thuật Tương Tác Chuột)

- **Skill đặc thù:** [`.agent/skills/hud-aesthetic-crucible/SKILL.md`](file:///d:/_Study/cyberpulse-3d/.agent/skills/hud-aesthetic-crucible/SKILL.md)
- **Đáp ứng chỉ thị của USER:**
  - *"không được, khi các hành tinh quay quanh qua mặt trời thì cái khóa bị lỗi dịch qua hành tinh đó, t có ý tưởng là khi di chuột hay tự làm gì đó thì nó mới hiện ra á"*
  - *"cái giao diện khi hover xấu quá, làm đẹp hơn, ít chữ nhưng mang tính học thuật"*
- **Triển khai kỹ thuật (`VisualizerCanvas.tsx`, `SpacecraftObservationDeck.tsx`):**
  1. **Chế độ Tĩnh Lặng Tuyệt Đối (Cinematic Silence by Default):**
     - Khi nghe nhạc và thả chuột, màn hình $100\%$ không gian vô cực, không có bất kỳ khung hộp nào tự động nhảy ra làm phiền khi các hành tinh cắt qua Mặt Trời.
  2. **Kính AI Khám Phá Chủ Đích (Intentional Hover Discovery - $R < 48\text{px}$):**
     - Con trỏ quang học vi mô bám theo chuột khi di chuyển.
     - Khi lướt sát hành tinh ($R < 48\text{px}$), kính tự động khóa vào hành tinh đó bằng thị kính quang học (Optical Graticule Reticle: broken arc quadrants + cardinal crosshair ticks).
  3. **Thông Số Thiên Văn Chuẩn Học Thuật Quốc Tế (Academic IAU Telemetry):**
     - Hàng 1: Ký hiệu thiên văn (`☉`, `♁`, `♃`, `♄`, `♂`, `♀`, `☿`, `♅`, `♆`, `⚳`, `♇`) + Tên danh pháp quốc tế + Khoảng cách quan trắc thực tại (`15.79 AU_obs`).
     - Hàng 2: Phân loại quang phổ / địa chất học thuật + Bán trục lớn nhật tâm ($a_\odot$) + Tỷ lệ khối lượng chuẩn ($M_\oplus$ hoặc $M_\odot$):
       `N2-O2 HYDROSPHERE | 1.000 AU_☉ | 1.000 M⊕`
       `G2V MAIN SEQUENCE | 0.000 AU_☉ | 1.000 M☉`
       `H-HE GAS GIANT | 5.204 AU_☉ | 317.8 M⊕`
  4. **Tự Động Đảo Hướng & Click-to-Inspect:**
     - Tự động lật thẻ sang trái khi hành tinh ở mép phải màn hình ($x > 62\%$).
     - Click trực tiếp vào nhãn để phóng camera tới kiểm tra cận cảnh hành tinh.
     - Tự động ẩn êm ái (`fadeout`) sau 2.8s không chạm chuột.
  5. **Hiệu năng:** Khóa cứng **118–120 FPS**, cấp phát **0 byte GC per frame**, vượt qua `npm run build` 100%.
