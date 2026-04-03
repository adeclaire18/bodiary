import cv2
import numpy as np

# 全局变量：阈值（默认127）
threshold_value = 127

# 滑动条回调函数（滑动时更新阈值）
def update_threshold(val):
    global threshold_value
    threshold_value = val

def main():
    # ========== 在这里修改你的图片路径 ==========
    img_path = "test.jpg"  
    # ==========================================

    # 读取图片
    img = cv2.imread(img_path)
    if img is None:
        print("错误：无法读取图片，请检查路径是否正确！")
        return

    # 转灰度图
    gray = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)

    # 创建窗口
    cv2.namedWindow("Binary Image (Adjust Threshold)")

    # 创建滑动条：名字、窗口名、最小值、最大值、回调函数
    cv2.createTrackbar("Threshold", "Binary Image (Adjust Threshold)", threshold_value, 255, update_threshold)

    print("=== 操作说明 ===")
    print("滑动条调节阈值")
    print("按 s 保存黑白图")
    print("按 ESC 退出")

    while True:
        # 二值化核心代码
        _, binary = cv2.threshold(gray, threshold_value, 255, cv2.THRESH_BINARY)

        # 显示结果
        cv2.imshow("Binary Image (Adjust Threshold)", binary)

        # 按键检测
        key = cv2.waitKey(1) & 0xFF
        if key == 27:  # ESC 退出
            break
        elif key == ord('s'):  # s 保存
            cv2.imwrite("binary_result.jpg", binary)
            print(f"已保存：binary_result.jpg（阈值={threshold_value}）")

    # 释放窗口
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()