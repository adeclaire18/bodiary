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

  // 3. 存储已经放置在身体上的标记
  List<Map<String, dynamic>> droppedMarkers = [];
  // 模拟每个图标的剩余可用数量（最高 3 个）
  Map<String, int> markerCounts = {'good': 3, 'bad': 3, 'other': 3};

  // 4. 要存储的数据结构
  final TextEditingController _textController = TextEditingController();
  List<Map<String, dynamic>> savedSnapshots = [];

  // 5. 保存
  void _saveSnapshot() {
    final snapshot = {
      'date': DateTime.now().toString(),
      'text': _textController.text,
      'markers': List<Map<String, dynamic>>.from(droppedMarkers),
    };

    setState(() {
      savedSnapshots.add(snapshot);
    });

    // 可选：保存后清空输入
    _textController.clear();

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Saved")),
    );
  }

  
  // 5. 左侧工具栏的图标构建（带数量限制逻辑）
  Widget _buildDraggableIcon(String type, int count) {
    const double size = 24.0;
    final Offset centerOffset = Offset(size / 2, size / 2);

    return SizedBox(
      height: 80, 
      width: 60,
      child: Center(
        child: Draggable<String>(
          data: type,
          dragAnchorStrategy: pointerDragAnchorStrategy, 
          
          feedback: Material(
            color: Colors.transparent,
            child: Transform.translate(
              // ✅ 用动态中心点，不再写死 20
              offset: -centerOffset,
              child: _getIconByType(type),
            ),
          ),
          
          childWhenDragging: Opacity(
            opacity: 0.1,
            child: _getIconByType(type),
          ),
          
          child: Column(
            mainAxisSize: MainAxisSize.min,
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


  Widget _getIconByType(String type) {
    // --- 核心修正：全局统一尺寸 24 ---
    double size = 24.0; 

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


  Widget _buildInnerControls() {
    bool hasMarkers = droppedMarkers.isNotEmpty;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [

          // ✅ 1. 上面：按钮（不动）
          Row(
            children: [
              Expanded(child: _toggleButton("SKELETON", showSkeleton, () => setState(() => showSkeleton = !showSkeleton))),
              const SizedBox(width: 6),
              Expanded(child: _toggleButton("MUSCLES", showMuscles, () => setState(() => showMuscles = !showMuscles))),
              const SizedBox(width: 6),
              Expanded(child: _toggleButton("ORGANS", showOrgans, () => setState(() => showOrgans = !showOrgans))),
            ],
          ),

          const SizedBox(height: 10),

          // ✅ 2. 下面：输入框 + SAVE 横排
          Row(
            children: [
              // 👉 输入框占满剩余空间
              Expanded(
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 300),
                  opacity: hasMarkers ? 1.0 : 0.0,
                  child: IgnorePointer(
                    ignoring: !hasMarkers,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.03),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: TextField(
                        controller: _textController,
                        textAlign: TextAlign.left, // 👉 改成左对齐更自然
                        decoration: const InputDecoration(
                          hintText: "Add a Note...",
                          border: InputBorder.none,
                          isCollapsed: true,
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 10),

              // 👉 SAVE 固定大小
              GestureDetector(
                onTap: _saveSnapshot,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    "SAVE",
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // 自动获取日期并格式化
  String _formatDate(DateTime date) {
    return "${date.year}.${date.month.toString().padLeft(2, '0')}.${date.day.toString().padLeft(2, '0')}";
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
        if (droppedMarkers.length >= 5) return;
        if (markerCounts[details.data]! <= 0) return;
        
        final RenderBox cardBox = _cardKey.currentContext!.findRenderObject() as RenderBox;
        final Offset cardGlobalPos = cardBox.localToGlobal(Offset.zero);
        
        // 解决偏移问题
        const double size = 24.0;
        final Offset centerOffset = Offset(20, 20);
        final Offset relativePosition =
            details.offset - cardGlobalPos - centerOffset;

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
              Positioned(
                top: 16,
                left: 16,
                child: Text(
                  _formatDate(DateTime.now()),
                  style: const TextStyle(color: Colors.black12, fontSize: 12, fontWeight: FontWeight.w300),
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
              ...droppedMarkers.map((marker) => DroppedMarkerWidget(
                key: ValueKey(marker.hashCode), // 必须加 Key 保证状态独立
                marker: marker,
                icon: _getIconByType(marker['type']),
                onRemove: () {
                  setState(() {
                    markerCounts[marker['type']] = markerCounts[marker['type']]! + 1;
                    droppedMarkers.remove(marker);
                  });
                },
              )).toList(),

              // 5. 底部输入 + 控制按钮（放进卡片内部）
              Positioned(
                left: 0,
                right: 0,
                bottom: 5, // 给时间留空间
                child: _buildInnerControls(),
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
          ],
        ),
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

class DroppedMarkerWidget extends StatefulWidget {
  final Map<String, dynamic> marker;
  final VoidCallback onRemove;
  final Widget icon;

  const DroppedMarkerWidget({
    super.key, 
    required this.marker, 
    required this.onRemove, 
    required this.icon
  });

  @override
  State<DroppedMarkerWidget> createState() => _DroppedMarkerWidgetState();
}

class _DroppedMarkerWidgetState extends State<DroppedMarkerWidget> {
  bool isVisible = true;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: widget.marker['position'].dx,
      top: widget.marker['position'].dy,
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 200),
        opacity: isVisible ? 1.0 : 0.0,
        curve: Curves.easeOut,
        onEnd: () { if (!isVisible) widget.onRemove(); }, // 动画结束再彻底从列表移除
        child: GestureDetector(
          onTap: () => setState(() => isVisible = false),
          child: MouseRegion(
            cursor: SystemMouseCursors.click,
            child: Container(
              padding: const EdgeInsets.all(8), // 增加命中区
              color: Colors.transparent,
              child: widget.icon,
            ),
          ),
        ),
      ),
    );
  }
}