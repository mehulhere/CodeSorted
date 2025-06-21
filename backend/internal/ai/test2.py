import json
import sys

# def parse_input(json_string):
#     data = json.loads(json_string)
#     nums1 = data['nums1']
#     nums2 = data['nums2']
#     return nums1, nums2


# json_string = sys.stdin.readline()
# nums1, nums2 = parse_input(json_string)

nums1 = []
nums2 = []
from test import median_of_two_sorted_arrays

import sys

result = median_of_two_sorted_arrays(nums1, nums2)
print(result)
