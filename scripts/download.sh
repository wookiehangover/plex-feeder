#!/bin/bash -e

url=$1
title=$2
dir="${3-.}"

if [[ -z $url ]] ; then
  echo "No url argument supplied"
  exit 1
fi

if [[ -z $title ]] ; then
  echo "No title argument supplied"
  exit 1
fi

filename="$title.mp4"

echo "Preparing to download $title"
mkdir -p "$dir"

echo "Saving file to $dir/$filename"
wget -c $url -O "$dir/$filename"
