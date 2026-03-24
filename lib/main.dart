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

  // --- 占位 SVG 字符串 (实际开发时可替换为外部文件) ---
  final String svgSkin = '''<svg viewBox="0 0 200 400"><path d="M100 20 C70 20 60 50 60 80 C60 120 40 150 40 220 L40 380 L80 380 L90 260 L110 260 L120 380 L160 380 L160 220 C160 150 140 120 140 80 C140 50 130 20 100 20Z" fill="none" stroke="#333" stroke-width="2"/></svg>''';
  final String svgSkeleton = '''<svg viewBox="0 0 200 400"><g fill="none" stroke="blue" stroke-width="2"><path d="M80 100 Q100 90 120 100 M80 120 Q100 110 120 120 M80 140 Q100 130 120 140"/><path d="M100 80 L100 250"/></g></svg>''';
  final String svgOrgans = '''<svg viewBox="0 0 200 400"><circle cx="100" cy="110" r="15" fill="red" opacity="0.6"/></svg>''';
  final String svgMuscles = '''<svg viewBox="0 0 200 400"><path d="M65 150 Q80 180 65 250 M135 150 Q120 180 135 250" fill="none" stroke="orange" stroke-width="4"/></svg>''';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Body Record")),
      body: Column(
        children: [
          // 1. 人体显示区域
          Expanded(
            child: Center(
              child: AspectRatio(
                aspectRatio: 0.5,
                child: Stack(
                  key: _canvasKey, // 给容器贴上标签，用于精确定位
                  alignment: Alignment.center,
                  children: [
                    SvgPicture.string(svgSkin),
                    if (showSkeleton) SvgPicture.string(svgSkeleton),
                    if (showMuscles) SvgPicture.string(svgMuscles),
                    if (showOrgans) SvgPicture.string(svgOrgans),
                    
                    GestureDetector(
                      onPanUpdate: (details) {
                        final RenderBox box = _canvasKey.currentContext!.findRenderObject() as RenderBox;
                        final Offset localOffset = box.globalToLocal(details.globalPosition);
                        
                        setState(() {
                          points.add(localOffset);
                        });
                      },
                      onPanEnd: (details) {
                        setState(() {
                          // 之前的代码：points.add(null);
                          // 现在加入路径闭合功能
                          
                          // --- 新增 logic ---
                          // 找出刚才画的那一笔的所有点（即 points 列表中从最后向前数，直到 null 或起点）
                          List<Offset> currentSegment = [];
                          for (var i = points.length - 1; i >= 0; i--) {
                            if (points[i] == null) break;
                            currentSegment.insert(0, points[i]!);
                          }

                          // 如果有点，就形成封闭 Path
                          if (currentSegment.isNotEmpty) {
                            Path polygonPath = Path();
                            polygonPath.addPolygon(currentSegment, true); // true 表示自动将终点连回起点闭合
                            paths.add(polygonPath); // 我们需要一个新的 List 来存封闭后的多边形
                            points.clear(); // 清空临时绘图点
                          }
                        });
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
          // 2. 控制按钮区域
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildToggleButton("骨骼", showSkeleton, () => setState(() => showSkeleton = !showSkeleton)),
                _buildToggleButton("肌肉", showMuscles, () => setState(() => showMuscles = !showMuscles)),
                _buildToggleButton("脏器", showOrgans, () => setState(() => showOrgans = !showOrgans)),
              ],
            ),
          ),
        ],
      ),
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