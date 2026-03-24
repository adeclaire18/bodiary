import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

void main() => runApp(const BodyRecordApp());

class BodyRecordApp extends StatelessWidget {
  const BodyRecordApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.green),
      home: const BodyCanvasScreen(),
    );
  }
}

class BodyCanvasScreen extends StatefulWidget {
  const BodyCanvasScreen({super.key});

  @override
  State<BodyCanvasScreen> createState() => _BodyCanvasScreenState();
}

class _BodyCanvasScreenState extends State<BodyCanvasScreen> {
  // 控制图层显示的变量
  bool showSkeleton = false;
  bool showOrgans = false;
  bool showMuscles = false;
  // 修正偏移问题
  final GlobalKey _canvasKey = GlobalKey();
  // 存储封闭路径的列表
  List<Path> paths = [];

  // 定义标签及其颜色
  String? selectedTag; 
  final Map<String, Color> tagColors = {
    'good': Colors.green,
    'bad': Colors.red,
    'confused': Colors.orange,
  };

  // --- 占位 SVG 字符串 (实际开发时可替换为外部文件) ---
  final String svgSkin = '''<svg viewBox="0 0 200 400"><path d="M100 20 C70 20 60 50 60 80 C60 120 40 150 40 220 L40 380 L80 380 L90 260 L110 260 L120 380 L160 380 L160 220 C160 150 140 120 140 80 C140 50 130 20 100 20Z" fill="none" stroke="#333" stroke-width="2"/></svg>''';
  final String svgSkeleton = '''<svg viewBox="0 0 200 400"><g fill="none" stroke="blue" stroke-width="2"><path d="M80 100 Q100 90 120 100 M80 120 Q100 110 120 120 M80 140 Q100 130 120 140"/><path d="M100 80 L100 250"/></g></svg>''';
  final String svgOrgans = '''<svg viewBox="0 0 200 400"><circle cx="100" cy="110" r="15" fill="red" opacity="0.6"/></svg>''';
  final String svgMuscles = '''<svg viewBox="0 0 200 400"><path d="M65 150 Q80 180 65 250 M135 150 Q120 180 135 250" fill="none" stroke="orange" stroke-width="4"/></svg>''';


  void _handlePanEnd() {
    List<Offset> currentSegment = [];
    for (var i = points.length - 1; i >= 0; i--) {
      if (points[i] == null) break;
      currentSegment.insert(0, points[i]!);
    }
    if (currentSegment.isNotEmpty) {
      setState(() {
        Path polygonPath = Path();
        polygonPath.addPolygon(currentSegment, true);
        paths.add(polygonPath);
        points.clear();
      });
      // 延迟一小会儿弹出，给用户看一眼“闭合动画”的时间
      Future.delayed(const Duration(milliseconds: 300), () {
        _showRecordSheet(context);
      });
    }
  }

  // 弹出半屏记录卡片
  void _showRecordSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true, // 允许全屏高度
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.7,
          maxChildSize: 0.9,
          expand: false,
          builder: (_, scrollController) {
            return SingleChildScrollView(
              controller: scrollController,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    const Text("How do you feel?", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 20),
                    // 这里放入我们刚才写的三个 Tag 按钮
                    _buildTagSelector(), 
                    const Divider(),
                    // 占位符：下一步我们将实现滚轮日期和旋转钟表
                    const SizedBox(height: 100, child: Center(child: Text("Date Wheel & Clock Picker coming soon..."))),
                    const TextField(decoration: InputDecoration(hintText: "Add a note (Optional)")),
                    const SizedBox(height: 20),
                    ElevatedButton(onPressed: () => Navigator.pop(context), child: const Text("Save Snapshot")),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Record Body"),
        actions: [
          if (paths.isNotEmpty) 
            TextButton(
              onPressed: () => _showRecordSheet(context), // 手动触发或自动触发
              child: const Text("Next"),
            )
        ],
      ),
      body: Column(
        children: [
          // 人体画布区域
          Expanded(
            child: Center(
              child: AspectRatio(
                aspectRatio: 0.5,
                child: Stack(
                  key: _canvasKey,
                  alignment: Alignment.center,
                  children: [
                    SvgPicture.string(svgSkin),
                    if (showSkeleton) SvgPicture.string(svgSkeleton, color: Colors.blue.withOpacity(0.3)),
                    if (showMuscles) SvgPicture.string(svgMuscles, color: Colors.orange.withOpacity(0.3)),
                    if (showOrgans) SvgPicture.string(svgOrgans, color: Colors.red.withOpacity(0.3)),
                    
                    GestureDetector(
                      onPanUpdate: (details) {
                        final RenderBox box = _canvasKey.currentContext!.findRenderObject() as RenderBox;
                        final Offset localOffset = box.globalToLocal(details.globalPosition);
                        setState(() => points.add(localOffset));
                      },
                      onPanEnd: (details) {
                        _handlePanEnd(); // 提取逻辑到方法中
                      },
                      child: CustomPaint(
                        painter: PathPainter(points: points, paths: paths),
                        size: Size.infinite,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          // 底部辅助开关 (恢复位置)
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildToggleButton("骨骼", showSkeleton, () => setState(() => showSkeleton = !showSkeleton)),
                  _buildToggleButton("肌肉", showMuscles, () => setState(() => showMuscles = !showMuscles)),
                  _buildToggleButton("脏器", showOrgans, () => setState(() => showOrgans = !showOrgans)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTagSelector() {
    return StatefulBuilder( // 使用 StatefulBuilder 确保弹窗内部点击能即时刷新
      builder: (BuildContext context, StateSetter setSheetState) {
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: tagColors.keys.map((tag) {
            bool isSelected = selectedTag == tag;
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8.0),
              child: ChoiceChip(
                label: Text(
                  tag.toUpperCase(),
                  style: TextStyle(
                    color: isSelected ? Colors.white : tagColors[tag],
                    fontWeight: FontWeight.bold,
                  ),
                ),
                selected: isSelected,
                selectedColor: tagColors[tag],
                onSelected: (bool selected) {
                  // 同时刷新弹窗内部状态和外部类状态
                  setSheetState(() => selectedTag = selected ? tag : null);
                  setState(() => selectedTag = selected ? tag : null);
                },
                backgroundColor: tagColors[tag]!.withOpacity(0.1),
                shape: StadiumBorder(side: BorderSide(color: tagColors[tag]!)),
              ),
            );
          }).toList(),
        );
      },
    );
  }

  Widget _buildToggleButton(String label, bool isActive, VoidCallback onTap) {
    return FilterChip(
      label: Text(label),
      selected: isActive,
      onSelected: (_) => onTap(),
    );
  }

  // 实现 Canvas 画笔追踪：一个用于存储路径点的列表
  List<Offset?> points = []; 

}


// 实现 Canvas 画笔追踪：添加自定义绘画类
class PathPainter extends CustomPainter {
  final List<Offset?> points; // 正在画的点（线条）
  final List<Path> paths;    // 已经画完的封闭多边形

  PathPainter({required this.points, required this.paths});

  @override
  void paint(Canvas canvas, Size size) {
    // A. 绘制正在画的线条（给用户实时反馈）
    if (points.isNotEmpty) {
      Paint linePaint = Paint()
        ..color = Colors.red
        ..strokeCap = StrokeCap.round
        ..strokeWidth = 3.0
        ..style = PaintingStyle.stroke;

      for (int i = 0; i < points.length - 1; i++) {
        if (points[i] != null && points[i + 1] != null) {
          canvas.drawLine(points[i]!, points[i + 1]!, linePaint);
        }
      }
    }

    // B. 绘制已经保存的封闭多边形
    if (paths.isNotEmpty) {
      Paint fillPaint = Paint()
        ..color = Colors.red.withOpacity(0.8) // 80% 透明度
        ..style = PaintingStyle.fill; // 关键：设置为填充模式

      for (Path path in paths) {
        canvas.drawPath(path, fillPaint);
      }
    }
  }

  @override
  bool shouldRepaint(PathPainter oldDelegate) => true;
}