import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

void main() => runApp(const BodySnapshotApp());

class BodySnapshotApp extends StatelessWidget {
  const BodySnapshotApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: const Color(0xFFF5F5F7), // 苹果风的浅灰背景
        useMaterial3: true,
      ),
      home: const MainCanvasPage(),
    );
  }
}

class MainCanvasPage extends StatefulWidget {
  const MainCanvasPage({super.key});

  @override
  State<MainCanvasPage> createState() => _MainCanvasPageState();
}

class _MainCanvasPageState extends State<MainCanvasPage> {
  // 控制图层显示
  bool showSkeleton = false;
  bool showMuscles = false;
  bool showOrgans = false;

  // 模拟 SVG 数据 (实际开发建议放入 assets)
  // 1. 在类顶部定义所有 SVG 字符串
  final String svgBody = '''<svg viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg"><path d="M100,50 C120,50 130,70 130,90 C130,110 120,130 100,130 C80,130 70,110 70,90 C70,70 80,50 100,50 M70,130 L60,250 L80,450 M130,130 L140,250 L120,450 M60,180 L30,280 M140,180 L170,280" fill="none" stroke="#EEEEEE" stroke-width="2"/></svg>''';
  final String svgSkeleton = '''<svg viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg"><path d="M100,60 L100,120 M85,140 L115,140 M90,160 L110,160 M95,180 L105,180" stroke="#B0C4DE" stroke-width="3" fill="none"/></svg>'''; // 示意骨骼
  final String svgMuscles = '''<svg viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg"><ellipse cx="100" cy="200" rx="30" ry="60" fill="#FFB6C1" fill-opacity="0.3"/></svg>'''; // 示意肌肉
  final String svgOrgans = '''<svg viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="250" r="20" fill="#FF6B6B" fill-opacity="0.4"/></svg>'''; // 示意脏器
  // 2. 关键：为卡片定义一个 Key 用于坐标转换
  final GlobalKey _cardKey = GlobalKey();

  // 存储已经放置在身体上的标记
  List<Map<String, dynamic>> droppedMarkers = [];
  // 模拟每个图标的剩余可用数量（最高 3 个）
  Map<String, int> markerCounts = {'good': 3, 'bad': 3, 'other': 3};

  // // 1. 顶部日期水印
  // Widget _buildHeader() {
  //   return const Padding(
  //     padding: EdgeInsets.symmetric(horizontal: 40.0, vertical: 20.0),
  //     child: Align(
  //       alignment: Alignment.centerLeft,
  //       child: Text(
  //         "2026.03.24", // 这里的日期可以根据 DateTime.now() 动态生成
  //         style: TextStyle(
  //           color: Colors.black12, // 极淡的灰色，不干扰视线
  //           fontSize: 16,
  //           fontWeight: FontWeight.w300,
  //           letterSpacing: 1.2,
  //         ),
  //       ),
  //     ),
  //   );
  // }

  // 2. 左侧工具栏的图标构建（带数量限制逻辑）
  Widget _buildDraggableIcon(String type, int count) {
    bool isAvailable = count > 0 && droppedMarkers.length < 5;
      return Padding(
      padding: const EdgeInsets.symmetric(vertical: 15),
      child: Draggable<String>(
        data: type,
        // 关键：设置拖拽锚点为物体的中心，这样鼠标尖就会指在图标正中间
        dragAnchorStrategy: pointerDragAnchorStrategy,
        // 拖动时的“影子”：稍微放大，增加手感
        feedback: Material(
          color: Colors.transparent,
          child: _getIconByType(type, isDragging: true),
        ),
        // 拖动时留在原地的“坑”：变淡
        childWhenDragging: Opacity(
          opacity: 0.2,
          child: _getIconByType(type),
        ),
        // 正常显示的图标
        child: Opacity(
          opacity: isAvailable ? 1.0 : 0.1, // 不可用时几乎透明
          child: Column(
            children: [
              _getIconByType(type),
              const SizedBox(height: 4),
              Text(
                count.toString(), 
                style: const TextStyle(fontSize: 10, color: Colors.black26)
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _getIconByType(String type, {bool isDragging = false, bool isSmall = false}) {
    double size = isSmall ? 24 : 30;
    // 移除 isDragging 的放大判断，保持 size 一致

    switch (type) {
      case 'good':
        return Icon(Icons.check_circle_outline, color: Colors.green.withOpacity(0.7), size: size);
      case 'bad':
        return Icon(Icons.cancel_outlined, color: Colors.red.withOpacity(0.7), size: size);
      case 'other':
        return Icon(Icons.cloud_outlined, color: Colors.purple.withOpacity(0.7), size: size);
      default:
        return const SizedBox();
    }
  }


  Widget _buildMainCard() {
    return Container(
      key: _cardKey,
      width: 300, // 固定宽度，让比例更稳
      height: 520, 
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(4), // 极小圆角，更硬朗极简
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 15)
        ],
      ),
      child: DragTarget<String>(
      onAcceptWithDetails: (details) {
        final RenderBox cardBox = _cardKey.currentContext!.findRenderObject() as RenderBox;
        final Offset cardGlobalPos = cardBox.localToGlobal(Offset.zero);
        
        // 现在的偏移计算：直接用鼠标位置减去卡片原点
        // 考虑到 Positioned 是基于左上角渲染的，我们减去图标半径 (12)，让图标“盖”在鼠标点上
        final Offset relativePosition = details.offset - cardGlobalPos - const Offset(12, 12);

        setState(() {
          droppedMarkers.add({
            'type': details.data,
            'position': relativePosition,
          });
          markerCounts[details.data] = markerCounts[details.data]! - 1;
        });
      },
        builder: (context, candidateData, rejectedData) {
          return Stack(
            children: [
              // 1. 卡片内左上角日期 (不再随页面移动)
              const Positioned(
                top: 16,
                left: 16,
                child: Text(
                  "2026.03.24",
                  style: TextStyle(color: Colors.black12, fontSize: 12, fontWeight: FontWeight.w300),
                ),
              ),

              // 2. 居中的人体底层
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 60), // 给上下留出日期和时间空间
                  child: SvgPicture.string(svgBody),
                ),
              ),

              // 3. 图层叠加
              if (showSkeleton) Center(child: SvgPicture.string(svgSkeleton)),
              if (showMuscles) Center(child: SvgPicture.string(svgMuscles)),
              if (showOrgans) Center(child: SvgPicture.string(svgOrgans)),

              // 4. 实时标记图标
              ...droppedMarkers.map((marker) {
                return Positioned(
                  left: marker['position'].dx,
                  top: marker['position'].dy,
                  child: _getIconByType(marker['type'], isSmall: true),
                );
              }).toList(),

              // 5. 右下角时间水印
              Positioned(
                bottom: 16,
                right: 16,
                child: Text("18:42", style: TextStyle(color: Colors.black.withOpacity(0.05), fontSize: 10)),
              ),
            ],
          );
        },
      ),
    );
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // // 顶部日期
            // _buildHeader(),

            // 核心画布区
            Expanded(
              child: Stack(
                children: [
                  // 居中的卡片
                  Center(child: _buildMainCard()),

                  // 左侧工具栏
                  Positioned(
                    left: 20,
                    top: 100,
                    child: Column(
                      children: markerCounts.entries
                          .map((e) => _buildDraggableIcon(e.key, e.value))
                          .toList(),
                    ),
                  ),
                ],
              ),
            ),

            // 底部控制区
            _buildBottomControls(),
          ],
        ),
      ),
    );
  }

  // 底部控制栏组件
  Widget _buildBottomControls() {
    // 判断是否已经放置了标记
    bool hasMarkers = droppedMarkers.isNotEmpty;

    return Container(
      // 底部留出安全距离
      padding: const EdgeInsets.fromLTRB(30, 0, 30, 40), 
      child: Column(
        mainAxisSize: MainAxisSize.min, // 自动适配内容高度
        children: [
          // 1. 动态显现的输入框
          AnimatedOpacity(
            duration: const Duration(milliseconds: 500),
            opacity: hasMarkers ? 1.0 : 0.0,
            curve: Curves.easeInOut,
            child: IgnorePointer(
              ignoring: !hasMarkers, // 没有标记时不可交互
              child: TextField(
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 15, color: Colors.black87, fontWeight: FontWeight.w400),
                decoration: const InputDecoration(
                  hintText: "How's your body feeling?",
                  hintStyle: TextStyle(color: Colors.black12),
                  border: InputBorder.none,
                ),
              ),
            ),
          ),

          const SizedBox(height: 15), // 输入框与按钮之间的呼吸感间距

          // 2. 三个功能切换按钮 (SKELETON, MUSCLES, ORGANS)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _toggleButton("SKELETON", showSkeleton, 
                  () => setState(() => showSkeleton = !showSkeleton)),
              _toggleButton("MUSCLES", showMuscles, 
                  () => setState(() => showMuscles = !showMuscles)),
              _toggleButton("ORGANS", showOrgans, 
                  () => setState(() => showOrgans = !showOrgans)),
            ],
          ),
        ],
      ),
    );
  }

  

  Widget _toggleButton(String label, bool active, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: active ? Colors.black.withOpacity(0.05) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: active ? Colors.black12 : Colors.transparent),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: active ? Colors.black87 : Colors.black26,
          ),
        ),
      ),
    );
  }

  Widget _buildLayerPlaceholder(Color color, String label) {
    return Opacity(
      opacity: 0.2,
      child: Container(color: color), // 暂时用颜色占位，后续替换为真实 SVG
    );
  }
}