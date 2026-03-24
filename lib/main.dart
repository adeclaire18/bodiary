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
                aspectRatio: 0.5, // 保持 1:2 的人体比例
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // 皮肤层 (始终显示)
                    SvgPicture.string(svgSkin),
                    // 骨骼层
                    if (showSkeleton) SvgPicture.string(svgSkeleton),
                    // 肌肉层
                    if (showMuscles) SvgPicture.string(svgMuscles),
                    // 脏器层
                    if (showOrgans) SvgPicture.string(svgOrgans),
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
}