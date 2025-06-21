def median_of_two_sorted_arrays(nums1: list[int], nums2: list[int]) -> float:
    merged_array = sorted(nums1 + nums2)
    n = len(merged_array)

    if n % 2 == 0:
        # Even number of elements
        mid1 = merged_array[n // 2 - 1]
        mid2 = merged_array[n // 2]
        median = (mid1 + mid2) / 2
    else:
        # Odd number of elements
        median = float(merged_array[n // 2])

    return median
