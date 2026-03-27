import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

void main() => runApp(const BodySnapshotApp());


/**
 * BodySnapshotApp - 人体快照应用主类
 * 
 * 这是一个用于记录身体健康状况的 Flutter 应用。
 * 用户可以在人体图形上标记身体部位的问题或状态，
 * 并保存为快照以便后续查看。
 * 
 * 主要功能：
 * 1. 可视化人体模型
 * 2. 拖拽式标记身体部位（好/坏/其他）
 * 3. 切换显示不同图层（骨骼、肌肉、器官）
 * 4. 保存快照到卡片流
 * 5. 预览和管理历史快照
 */
class BodySnapshotApp extends StatelessWidget {
  const BodySnapshotApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      // 关闭 Debug 横幅
      debugShowCheckedModeBanner: false,
      // 配置主题：苹果风浅灰背景 + Material 3 设计
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


/**
 * _MainCanvasPageState - 主画布页面状态管理类
 * 
 * 应用的核心页面，包含：
 * - 人体模型展示区
 * - 左侧工具栏（可拖拽的标记图标）
 * - 底部控制区（图层切换、输入框、保存按钮）
 * - 预览模式下的卡片流视图
 */
class _MainCanvasPageState extends State<MainCanvasPage> {
  // 控制图层显示（骨骼、肌肉、器官）
  bool showSkeleton = false;
  bool showMuscles = false;
  bool showOrgans = false;

  // 核心状态
  bool isPreviewMode = false; // 是否进入卡片流
  int currentIndex = 0; // 当前卡片 index
  bool flash = false; // 控制白闪

  // 模拟 SVG 数据 (实际开发建议放入 assets)
  // 1. 在类顶部定义所有 SVG 字符串
  final String svgBody = '''<svg viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg"><path d="M100,50 C120,50 130,70 130,90 C130,110 120,130 100,130 C80,130 70,110 70,90 C70,70 80,50 100,50 M70,130 L60,250 L80,450 M130,130 L140,250 L120,450 M60,180 L30,280 M140,180 L170,280" fill="none" stroke="#EEEEEE" stroke-width="2"/></svg>''';
  final String svgSkeleton = '''<svg viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg"><path d="M100,60 L100,120 M85,140 L115,140 M90,160 L110,160 M95,180 L105,180" stroke="#B0C4DE" stroke-width="3" fill="none"/></svg>'''; // 示意骨骼
  final String svgMuscles = '''<svg viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg"><ellipse cx="100" cy="200" rx="30" ry="60" fill="#FFB6C1" fill-opacity="0.3"/></svg>'''; // 示意肌肉
  final String svgOrgans = '''<svg viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="250" r="20" fill="#FF6B6B" fill-opacity="0.4"/></svg>'''; // 示意脏器
  
  // 2. 为卡片定义一个 Key 用于坐标转换
  final GlobalKey _cardKey = GlobalKey();

  // 3. 存储已经放置在身体上的标记
  List<Map<String, dynamic>> droppedMarkers = [];
  // 每个图标的剩余可用数量（最高 3 个）
  Map<String, int> markerCounts = {'good': 3, 'bad': 3, 'other': 3};

  // 4. 保存
  // 文本输入控制器，用于获取用户输入的备注
  final TextEditingController _textController = TextEditingController();
  // 要存储的数据列表
  List<Map<String, dynamic>> savedSnapshots = [];
  // 保存快照函数
  void _saveSnapshot() {
      /**
      * 保存快照
      * 
      * 将当前画布上的所有数据（标记、备注）保存为一个快照，
      * 并触发保存动画效果。
      * 
      * 流程：
      * 1. 创建快照数据对象
      * 2. 添加到保存列表
      * 3. 触发 100ms 白闪动画
      * 4. 100ms 后关闭白闪并切换到预览模式
      * 5. 清空输入框
      */

    final snapshot = {
      'date': DateTime.now().toString(),
      'text': _textController.text,
      'markers': List<Map<String, dynamic>>.from(droppedMarkers),

      // ✅（建议一起存）
      'showSkeleton': showSkeleton,
      'showMuscles': showMuscles,
      'showOrgans': showOrgans,
    };

    setState(() {
      savedSnapshots.add(snapshot);

      // ✅ 始终定位到最新卡片
      currentIndex = savedSnapshots.length - 1;

      // ✅ 关键：直接进入 preview（不要再来回切）
      isPreviewMode = true;
    });

    // ✅ 清空编辑态（为下一次准备）
    droppedMarkers.clear();
    markerCounts = {'good': 3, 'bad': 3, 'other': 3};
    _textController.clear();
  }


  Widget _buildBodyBase({bool skeleton = false, bool muscles = false, bool organs = false}) {
    return Center(
      child: SizedBox(
        width: 200,  // 固定 SVG 容器宽度
        height: 400, // 固定 SVG 容器高度
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            SvgPicture.string(svgBody, fit: BoxFit.contain),
            if (skeleton) SvgPicture.string(svgSkeleton, fit: BoxFit.contain),
            if (muscles) SvgPicture.string(svgMuscles, fit: BoxFit.contain),
            if (organs) SvgPicture.string(svgOrgans, fit: BoxFit.contain),
          ],
        ),
      ),
    );
  }
  
  // 左侧工具栏的图标构建（带数量限制逻辑）
  /**
   * 构建可拖拽的图标组件（左侧工具栏）
   * 
   * 这是一个可以被拖拽到人体卡片上的图标，
   * 支持三种类型：
   * - good: 绿色勾选标记，表示良好的身体状态
   * - bad: 红色叉号标记，表示问题或疼痛部位
   * - other: 紫色云朵标记，表示其他需要关注的部位
   * 
   * 参数说明：
   * - type: 标记类型
   * - count: 剩余可用数量
   * 
   * 实现逻辑：
   * 1. 使用 Draggable Widget 使图标可拖拽
   * 2. 拖拽时显示半透明的图标作为反馈
   * 3. 拖拽过程中原位置显示变淡的图标
   * 4. 下方显示剩余可用数量
   */
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



  /**
   * 根据类型获取对应的图标组件
   * 
   * 支持三种标记类型：
   * - good: 绿色勾选圆圈，表示健康状态
   * - bad: 红色叉号，表示问题状态
   * - other: 紫色云朵，表示其他状态
   */
  Widget _getIconByType(String type) {
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



  /**
   * 构建底部内嵌控制区
   * 
   * 包含两个部分：
   * 1. 上部分：图层切换按钮（SKELETON、MUSCLES、ORGANS）
   * 2. 下部分：输入框 + SAVE 按钮横向排列
   * 
   * 输入框会根据是否有标记动态显示/隐藏
   */
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

  // 自动获取日期并格式化: 将 DateTime 对象转换为 "YYYY.MM.DD" 格式的字符串
  String _formatDate(DateTime date) {
    return "${date.year}.${date.month.toString().padLeft(2, '0')}.${date.day.toString().padLeft(2, '0')}";
  }



  /**
   * 构建主编辑卡片
   * 
   * 应用的核心交互区域，包含：
   * 1. 左上角日期显示
   * 2. 居中的人体 SVG 图形
   * 3. 可选的图层叠加（骨骼、肌肉、脏器）
   * 4. 已放置的标记图标
   * 5. 底部控制区（输入框、图层切换、保存按钮）
   * 
   * 同时作为 DragTarget 接收从左侧工具栏拖拽来的标记
   */
  Widget _buildMainCard() {
    return Container(
      key: _cardKey,
      width: 300, 
      height: 520, 
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(4),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 15)],
      ),
      child: DragTarget<String>(
        builder: (context, candidateData, rejectedData) {
          return Stack(
            children: [
              // 1. 日期
              Positioned(top: 16, left: 16, child: Text(_formatDate(DateTime.now()), style: const TextStyle(color: Colors.black12, fontSize: 12))),
              
              // 2. 统一的身体层
              _buildBodyBase(skeleton: showSkeleton, muscles: showMuscles, organs: showOrgans),

              // 3. 渲染标记 (坐标逻辑保持中心点对齐)
              ...droppedMarkers.map((marker) => DroppedMarkerWidget(
                key: ValueKey(marker.hashCode),
                marker: marker,
                icon: _getIconByType(marker['type']),
                onRemove: () => setState(() {
                  markerCounts[marker['type']] = markerCounts[marker['type']]! + 1;
                  droppedMarkers.remove(marker);
                }),
              )).toList(),

              // 4. 控制按钮
              Positioned(left: 0, right: 0, bottom: 5, child: _buildInnerControls()),
            ],
          );
        },
        onAcceptWithDetails: (details) {
          final RenderBox cardBox = _cardKey.currentContext!.findRenderObject() as RenderBox;
          final Offset localPos = cardBox.globalToLocal(details.offset);

          setState(() {
            droppedMarkers.add({
              'type': details.data,
              // --- 关键：存储比例坐标 ---
              // 假设卡片固定逻辑尺寸是 300x520
              'relX': localPos.dx / 300, 
              'relY': localPos.dy / 520,
            });
            markerCounts[details.data] = markerCounts[details.data]! - 1;
          });
        },
      ),
    );
  }


  // 卡片组件
  /**
   * 构建快照卡片（预览模式使用）
   * 
   * 用于在卡片流中显示历史保存的快照。
   * 与主编辑卡片类似，但不包含编辑功能，
   * 只展示保存时的状态（标记、备注等）。
   * 
   * @param snapshot 快照数据 Map
   * @param scale 缩放比例（用于卡片流中的大小差异化）
   */
  Widget _buildSnapshotCard(Map<String, dynamic> snapshot) {
    return Container(
      width: 300,
      height: 520,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(4),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 20)],
      ),
      child: Stack(
        children: [
          // 1. 日期 (位置必须与编辑态一致)
          Positioned(top: 16, left: 16, child: Text(snapshot['date'].toString().substring(0, 10), style: const TextStyle(fontSize: 12, color: Colors.black26))),
          
          // 2. 统一的身体层 (关键：这里的布局必须和编辑态一模一样)
          _buildBodyBase(
            skeleton: snapshot['showSkeleton'] ?? false,
            muscles: snapshot['showMuscles'] ?? false,
            organs: snapshot['showOrgans'] ?? false,
          ),

          // 3. 渲染标记
          ...snapshot['markers'].map<Widget>((marker) {
            // 根据比例还原像素位置 (300x520 是卡片逻辑大小)
            final double posX = marker['relX'] * 300;
            final double posY = marker['relY'] * 520;

            return Positioned(
              left: posX - 12, // 12 是图标半径
              top: posY - 12,
              child: _getIconByType(marker['type']),
            );
          }).toList(),
        ],
      ),
    );
  }



  // 加号卡片
  /**
   * 构建添加新快照卡片
   * 
   * 显示在卡片流的最后位置，
   * 点击后返回编辑模式，准备创建新快照。
   */
  Widget _buildAddCard() {
      return GestureDetector(
        onTap: () {
          setState(() {
            isPreviewMode = false; // 退出预览，进入编辑
            // 清空旧数据，准备新记录
            droppedMarkers.clear();
            markerCounts = {'good': 3, 'bad': 3, 'other': 3};
            _textController.clear();
          });
        },
        child: Container(
          width: 300,
          height: 520,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: Colors.black.withOpacity(0.05), width: 2), // 加个虚线边框感更好
          ),
          child: const Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.add_rounded, size: 48, color: Colors.black12),
                SizedBox(height: 8),
                Text("NEW RECORD", style: TextStyle(color: Colors.black12, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ),
      );
    }





  
  // 用于切换显示人体内部结构图层
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

  /**
   * 构建图层占位符（临时用颜色占位，后续替换为真实 SVG）
   * 
   * 用于在主编辑卡片中显示人体内部结构图层。
   * 暂时用颜色占位，后续替换为真实 SVG 图形。
   * 
   * @param color 图层颜色
   * @param label 图层标签（显示在按钮上）
   */
  Widget _buildLayerPlaceholder(Color color, String label) {
    return Opacity(
      opacity: 0.2,
      child: Container(color: color), // 暂时用颜色占位，后续替换为真实 SVG
    );
  }

  // 1. 新增一个方法，用于从预览卡片“回填”数据到编辑态
  void _editExistingSnapshot(int index) {
    final snapshot = savedSnapshots[index];
    setState(() {
      // 回填标记数据
      droppedMarkers = List<Map<String, dynamic>>.from(snapshot['markers']);
      // 回填图层开关
      showSkeleton = snapshot['showSkeleton'] ?? false;
      showMuscles = snapshot['showMuscles'] ?? false;
      showOrgans = snapshot['showOrgans'] ?? false;
      // 回填文本
      _textController.text = snapshot['text'] ?? "";
      
      // 计算剩余可用数量 (3 - 已使用的数量)
      markerCounts = {'good': 3, 'bad': 3, 'other': 3};
      for (var m in droppedMarkers) {
        markerCounts[m['type']] = (markerCounts[m['type']] ?? 0) - 1;
      }

      isPreviewMode = false; // 进入编辑模式
    });
  }

  // 2. 修改 _buildPageView 里的点击逻辑
  Widget _buildPageView() {
    final int total = savedSnapshots.length + 1;
    return SizedBox(
        // 1. 稍微加大容器宽度，确保 0.85 倍的中心卡片左右有足够的“露脸”空间
        width: 650, 
        height: 600,
        child: PageView.builder(
          key: ValueKey('pv_${savedSnapshots.length}_$currentIndex'),
          controller: PageController(
            // 2. 关键：将比例从 0.6 下调至 0.48 ~ 0.52 之间
            // 值越小，两侧卡片露出的部分就越多。
            viewportFraction: 0.45, 
            initialPage: currentIndex,
          ),
          onPageChanged: (index) {
            setState(() => currentIndex = index);
          },
          itemCount: total,
          itemBuilder: (context, index) {
            // 保持你要求的缩放比例
            double scale = (index == currentIndex) ? 0.85 : 0.7;

            return Center(
              child: GestureDetector(
                onTap: () {
                  if (index == currentIndex) {
                    if (index == savedSnapshots.length) {
                      setState(() {
                        droppedMarkers.clear();
                        markerCounts = {'good': 3, 'bad': 3, 'other': 3};
                        _textController.clear();
                        isPreviewMode = false;
                      });
                    } else {
                      _editExistingSnapshot(index);
                    }
                  } else {
                    setState(() {
                      currentIndex = index;
                    });
                  }
                },
                // 3. 使用 AnimatedContainer 让切换时的缩放有一点点过渡感（可选，如果不想要可以删掉）
                child: AnimatedScale(
                  scale: scale,
                  duration: const Duration(milliseconds: 200),
                  child: index == savedSnapshots.length
                      ? _buildAddCard()
                      : _buildSnapshotCard(savedSnapshots[index]),
                ),
              ),
            );
          },
        ),
      );
  }

  // 3. 修改主编辑卡片的显示，使其比预览态（0.85）更小（例如 0.6）
  // 在 build 方法中修改
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Stack(
                children: [
                  Center(
                    child: isPreviewMode 
                      ? _buildPageView() 
                      // 编辑状态：保持 1.0 原始尺寸
                      : _buildMainCard(), 
                  ),
                  
                  // 工具栏：仅在编辑态显示
                  if (!isPreviewMode)
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
  
}


// 当标记被放置到人体卡片上后，显示的标记 widget。支持点击移除。
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
  // 控制标记的可见性（用于淡出动画）
  bool isVisible = true;

  /**
   * 构建已放置标记的 UI
   * 
   * 显示一个可点击的标记图标，点击后触发淡出动画，
   * 动画结束后从列表中移除。
   * 
   * 实现逻辑：
   * 1. 使用 Positioned 根据保存的位置定位
   * 2. AnimatedOpacity 实现点击淡出效果
   * 3. GestureDetector 处理点击事件
   * 4. MouseRegion 提供鼠标悬停效果
   * 5. 增加 padding 扩大点击区域
   */
  @override
  Widget build(BuildContext context) {
  
    final double posX = widget.marker['relX'] * 300;  
    final double posY = widget.marker['relY'] * 520;
  
    // --- 核心修复：基于逻辑中心来定位具有 padding 的 Widget ---
    // 1. widget.marker['position'] 存储的是图标在卡片逻辑坐标系中的逻辑中心点 (dx, dy)。
    // 2. 这里的 DroppedMarkerWidget 的 padding 为 8，图标大小为 24x24，所以它的总大小是 40x40。
    // 3. 图标本身在 40x40 Widget 中居中（图标中心位于 Widget 的 logical center (20, 20)）。
    // 4. 为了使 Widget 中的图标中心重合于逻辑中心 (dx, dy)，Widget 本身相对于逻辑中心的偏移量必须是 (20, 20)。
    // 5. 所以 Widget 的逻辑左上角点坐标应为 (dx - 20, dy - 20)。

    return Positioned(
      left: posX - 20, // 逻辑左上角 X, 20 是带 Padding 的 Widget 半径
      top: posY - 20,  // 逻辑左上角 Y
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
              child: widget.icon, // 图标本身居中放置。
            ),
          ),
        ),
      ),
    );
  }
}